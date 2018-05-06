# serverless-ReqRes

A light weight Express like Request and Response handler for serverless lambda functions

## Getting Started

Install it via npm:

```shell
npm install serverless-req-res --save
```

And include in your project:

```javascript
var ReqRes = require('serverless-req-res');
```

Get the Res and Req handlers:

```javascript
//file: handler.js
//serverlessEndpoint.com/getExample?userName="fooBar"
var reqRes = new ReqRes((req,res,rawServerlessEvent)=>{
  res.json({
    hello: req.params.userName
  })
})


module.exports = {
	get:reqRes.run //NOTE! .run is passed as the handler!!!
}
```
**NOTE!** you must pass **.run** in create your request handler or as the last call on your reqRes object you created

add the function to serverless.yaml
```yaml
functions:
  getExample:
    handler: src/handler.get
    description: an example of useing ReqRes
    events:
      - http:
          method: GET
          path: getExample
```

## Extendable with Plugins and .before()!



**you can use [.before()](#before) to extend a single function Or, you can set an array of plugins to run when creating a new ResReq**

include the plugins module

```javascript
var ReqRes = require('serverless-req-res');
```

create two plugins that vaildates user (proimse support) and sends back a 404 with a custom message
```javascript
//varify user based off token 
//this plugin key is "getUser"
let authUserPlugin = (req,res, rawServerlessEvent)=>{
 //return a promise!
  return new Promise((fullfill, reject)=>{
      getUser(req.headers.token).then((user)=>{
        // note: user.firstName = "Joe"
        req.user = user
        fulfill()
      }).catch(reject)  
  })
}

//create a custom response for a "specal usecase"
let handelNotFoundPlugin = (req, res, rawServerlessEvent)=>{
  res.notFound = (message)=>{
    if(!message) message = "404 - Not Found."
      ServerlessEvent.callback(null, {
            statusCode: 404,
            headers:{},
            body: message,
      })
  }
}
```
Exmaple of how to then run plugins and before

```javascript
let reqRes = new ReqRes((req,res)=>{
  //use first pugin to get req.user  
  res.send("hello! "+req.user.firstName + " it's now "+req.now )
})
//set req.now for only this function
.before((req, res, rawServerlessEvent)=>{
  req.now = new Date.now()
})
.plugins([
	authUserPlugin,
    handelNotFoundPlugin
])
//catch a plugin rejectcion
.catch((errors ,req,res, rawServerlessEvent)=>{
  //use second plugin to catch an error (first plugin rejected it's promise)
  res.notFound("User Not Found")
})
```



**NOTE:** All plugins and before()s are synchronously called (waterfall request) by default

```javascript
var handler = new ReqRes((req, res,rawServerlessEvent)=>{
  req.stack.push("Finally")
  //use our plugin
  res.json({
    message:"the stack is",
    stack:req.stack
  });
})
//Pass Object to add to req, or res
.before({
	req:{
		stack:[]
	}
})
//Passing a function that returns a Proimise will wait unfil it is resolved before running any other "before"
.before((req,res,rawServerlessEvent)=>{
	return new Promise((fulfill,reject)=>{
		setTimeout(()=>{
			req.stack.push("First")
			fulfill()
		},1000)
	})
})
.before((req,res,lambda)=>{
	req.stack.push("Second")
})
.catch((errors, req,res, lambda)=>{
	res.error(errors)
})
```
Returns
```json
{
    "message": "stack is",
    "stack": [
        "First",
        "Second",
        "Finally"
    ]
}
```
Plugins support Promise.all by wrapping  the plugin  functions in another array
```javascript
.plugins([
     asyncPlug1,
     [asyncPlug2, asyncPlug3],
     asyncPlug4
])
```  
Will run in this order:
1. call asyncPlug1 and wait to resolve
2. call asyncPlug2 and  asyncPlug3 (at the same time) (Promise.all) and wait for both to resolve
3. call asyncPlug4 and wait to resolve
4. call main ReqRes callback

## ServerlessEvent
In examples shown with 'rawServerlessEvent' ([constructor](#constructor), [before()](#before), [plugins](#extendable-with-plugins-and-before)) The object is the raw Serverless Event as an Object 
```
  {
    event:Object
    context:Object
    callback:Function
  }
```

## Some more Examples
### get Request headers

```javascript
console.log(req.headers)
```

### set Response headers

Add to the headers
```javascript
res.headers("foo","bar")
console.log(res.headers())
```
Overwtire headers by passing an object
```javascript
res.headers({
  "foo":"bar"
  "Content-Type":"text/html"
})
console.log(res.headers())
```

### Return JSON

```javascript
res.json({
  works:true;
})
```
Or JSONP
```javascript
res.jsonp({
  works:true;
},'callback')
```


### Handle a JS Error
Returns a 400 json response with error message and stack trace 
```javascript
try{
 var1.anUndefinedVar = aNotherUndefinedVar;
}catch(e){
  res.error(e)
}
```
# ReqRes Module

[ReqRes(Callback)](#constructor) Your main function to get access to res and req obejcts

[ReqRes.plugins(ARRAY(Callback|Object))](#plugin-constructor) Register a plugin array that will run on all  serverless requests

[reqRes.before(Callback|Object)](#before) runs a callback before main function

[reqRes.catch(Callback)](#catch) catch plugin or .before errors along with your main [constructor function](#constructor)

[reqRes.context(Object)](#context) set raw serverless contex

[reqRes.event(Object)](#event)  set raw serverless event

[reqRes.run(rawServerlessEvent, rawServerlessContex, rawServerlessCallback)](#run) handle raw serverless function call

## Constructor

```javascript 
var reqRes = new ReqRes(
  //the constructor 
  (req, res, rawServerlessEvent)=>{
    //send the request object to browser 
    res.json(req)
  }
); 
```

On serverless request, this 'constructor callback' will run after all [.before()](#before) and plugins have ran.

[Req](#req-object) Stores lambad request (headers, query parameters, url parameters...)

[Res](#res-object) Handle a response (json,jsonp,text,redritcs...)

[rawServerlessEvent](#serverlessEvent) access and override the raw serverless request (event, context, callback)

## Plugin Constructor
```javascript 
//fake auth plugin
//first param is string name of your plugin,
//seond pram is the callback to run apon a serverless request
let authplugin = (req, res, rawServerlessEvent)=>{
  return new Promise((fullfill, reject)=>{
      getUser(req.headers.token).then((user)=>{
        req.user = user
        fulfill()
      }).catch((e){
        req.user = null,
        req.userError = e.message
        fulfill()
      })  
  })
}

//ex:
reqRes.plugins([authplugin]);
```

**Note:** Plugins are not chanable and return undefined. You cannot use .before or any of the fallowing functions

## before
```javascript
reqRes.before((req,res,rawServerlessEvent)=>{
  req.userId = 123
})
```
Chainable Functions  to run (synchronously) before main function 
> **Type:** Function
> 
> **Param 'Callback':** Function to run before your main function (usefull for exdending the req or res objects) 
> 
> **Returns:** resReq

Example:
```javascript

//set req.server
reqRes.before({req:{
  "server":process.env.serverName
}})
//The Callback Supports Promises
.before((req,res)=>{
  return new Promise((fulfill, reject)=>{
    getUser(req.path.userId).then((user)=>{
      req.user = user
      fulfill()
    }).catch(reject)
  })
})
//this will wait until the proimse from .before (above) has resolved, then 
//add a custom response
.before((req,res)=>{
    res.jsonUpdated = (data)=>{
      data.accessedAt = new Date.now();
      data.accessedBy = req.user.id;
      res.json(data)
    }
})
```



## catch

```javascript
reqRes.before((req,res)=>{
    undefinedVar.value = 12345;
})
.catch((errors, req, res)=>{
  //return the array of errors
  res.error(errors)
})
```

returns
```json
[
    {
        "message": "undefinedVar is not defined",
        "stack": "ReferenceError: undefinedVar is not defined at ReqRes.before.req.stack ({above}}.js:2:4)  
        at checkFulfill ({{node_modules}}/index.js:187:21)"
    }
]
```

Catch all .before() and plugin errors and then your [constructor function](#constructor)
> **Type:** Function
> 
> **Param 'Callback':** Function that runs (after all befores have ran) and one or more befores threw a Promse reject   
> 
> **Returns:** resReq
Example 



## context;
```javascript
reqRes.context({callbackWaitsForEmptyEventLoop: false})
console.log(reqRes.context())
```
set defulats for the serverless context befure .run
> **Type:** Function
> 
> **Param 'contex':** If set, it will update the context 
> 
> **Returns:** contex (if parameters are empty) or undefined 

## event
```javascript
reqRes.event({headers: {}})
console.log(reqRes.event())
```
set defulats for the serverless event befure .run
> **Type:** Function
> 
> **Param 'event':** If set, it will update the context 
> 
> **Returns:** event (if parameters are empty) or undefined

## run
```javascript
var standerdHandler = (event, contex, callback)=>{
  rewReq.run(event, contex, callback)
}
```
Handles the raw serverless request (must be the last function in a ReqRes method chain)
> **Type:** Function
> 
> **Param 'event':**  serverless's request event
> 
> **Param 'contex':**  serverless's contex
> 
> **Param 'callback':** the serverless function to output 
> 
> **Returns:** undefined


# Req Object

## req.query 

> **Type:** Object 
> 
> **Returns:** a key value pairs of query parameters

## req.body 

**Type:** String | Object 

**Returns:** HTTP request body. If body is a JSON string, the string will be parsed to Object

## req.params 

> **Type:** Object 
> 
> **Returns:** a key value pairs of url query parameters

## req.path 

> **Type:** Object 
> 
> **Returns:** a key value pairs of url path parameters

## req.headers 

> **Type:** Object 
> 
> **Returns:** a key value pairs of request headers




# Res Object

## res.headers(header_key,header_value)  *OR* res.headers(Object) 

Get and Set the headers 
**Note**: running res.headers(Object) will overwrite all currently set headers
> **Type:** Function
> 
> **Param 'headers':**  A key/val object to set response headers.
> 
> **Returns:** hedars Object

## res.handle(Promise [, Headers])

Waits for proimsie to resolve before fullfilling the response (res.json) or displaying error (res.error) 
> **Type:** Function
> 
> **Param 'Promise**':  A JS Promise
> 
> **Pram 'Headers' (Optinal):** key/value object of headers to set  
> 
> **Returns:** serverless callback parameters


## res.json(StatusCode:int, Body:Object) *OR* res.json(Body:Object)

**fulfill the lamba function with a Json object** 

> **Type:** Function
> 
> **Param 'Body':**  Return this Object to serverless
> 
> **Prams 'statusCode' (Optinal):** Set the http response code, Defualts to 200  
> 
> **Returns:** serverless callback parameters
>
> **NOTE**: If queryparam "cb" or "callback" is set, jsonp will be returned

## res.jsonp(StatusCode:int, Body:Object, callback:string) *OR* res.jsonp(Body:Object, callback:string)

fulfill the lamba function with a string (such as html)

> **Type:** Function
> 
> **Prams 'statusCode' (Optinal):** Set the http response code, Defualts to 200  
>
> **Param 'Body':**  Return this string to serverless
> 
> **Prams 'statusCode' (Optinal):** Set the http response code, Defualts to 200  

## res.error(Javacript Error) *OR* res.error(Object)

fulfill the lamba function with an JS Thrown Error or Object;

if Thrown Error is past serverless will be called back with json body

```javascript 
{stack:"String of Stack trace", message:"error message"} 

``` 

If an object is past it will return your custom error object as jason body

> **Type:** Function
> 
> **Returns:** serverless callback parameters




**Returns:** serverless callback parameters


## License

MIT

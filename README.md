# serverless-ReqRes

A light weight Express like Request and Response handler for serverless lambda functions

## Getting Started

Install it via npm:

```shell
npm install serverless-ReqRes --save
```

And include in your project:

```javascript
var ReqRes = require('serverless-ReqRes');
```

Get the Res and Req handlers:

```javascript
//file: handler.js
//serverlessEndpoint.com/getExample?userName="fooBar"
var reqRes = new ReqRes((req,res)=>{
  res.json({
    hello: req.params.userName
  })
})

module.exports = {get:reqRes.run}
```
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

**Plugins will run globally on all resReq Objects when .run is called.**

**Alternatively, you can use [.before()](#before) to extend a single function**

include the plugins module

```javascript
var ReqRes = require('serverless-ReqRes');
//include the plugins module
var reqResPlugins = require('serverless-ReqRes/plugins');
```

create two plugins that vaildates user and sends back a 404 with a custom message
```javascript
//varify user based off token
reqResPlugins.add((res,req, ServerlessEvent)=>{
  return new Promise((fullfill, reject)=>{
      getUser(req.headers.token).then((user)=>{
        req.user = user
        fulfill()
      }).catch(reject)  
  })
  req.timestamp = new Date.now()
})

//create a custom response for a "specal usecase"
reqResPlugins.add((res,req, ServerlessEvent)=>{
  res.notFound = (message)=>{
    if(!message) message = "404 - Not Found."
      ServerlessEvent.callback(null, {
            statusCode: 404,
            headers:{},
            body: message,
      })
  }
})


let reqRes = new ReqRes((req,res)=>{
  //use first pugin to get req.user  
  res.send("hello! "+req.user.firstName + " it's now "+req.now )
})
//set req.now for only this function
.before((req, res, ServerlessEvent)=>{
  req.now = new Date.now()
})
//catch a plugin rejectcion
.catch((errors ,req,res, ServerlessEvent)=>{
  //use second plugin to catch an error (first plugin rejected it's promise)
  res.notFound("User Not Found")
})
```

### NOTE: All plugins and before()s are synchronously called
```javascript
var handler = new ReqRes((req, res)=>{
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
	}})
//Passing a function that returns a Proimise will wait unfil it is resolved before running any other "before"
.before((req,res,lambda)=>{
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


## ServerlessEvent
In examples shown with 'ServerlessEvent' ([constructor](#constructor), [before()](#before), [plugins](#extendable-with-plugins-and-before)) The object is the raw Serverless Event as an Object 
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

```javascript
res.headers({"foo":"bar"})
console.log(res.headers())
```

### Return json

```javascript
res.json({
  works:true;
})
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

[reqRes.before(Callback|Object)](#before) runs a callback before main function

[reqRes.catch(Callback)](#catch) catch plugin or .before errors along with your main [constructor function](#constructor)

[reqRes.context(Object)](#context) get/update raw serverless contex

[reqRes.event(Object)](#event)  get/update raw serverless event

[reqRes.run(rawServerlessEvent, rawServerlessContex, rawServerlessCallback)](#run) handle raw serverless function call

## constructor
```javascript 
var reqRes = new ReqRes(
//the constructor 
  (req,res,ServerlessEvent)=>{
    //send the request object to browser 
    res.json(req)
  }
); 
```
On serverless request, this 'constructor callback' will run after all [.before()](#before) and plugins have ran.

[Req](#req-object) Stores lambad request (headers, query parameters, url parameters...)

[Res](#res-object) Handle a response (json,jsonp,text,redritcs...)

## before
```javascript
reqRes.before((req,res,ServerlessEvent)=>{
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
        "stack": "ReferenceError: undefinedVar is not defined at ReqRes.before.req.stack ({youePath}dev.js:139:3)  
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
supports both get and put of the serverless contex
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
supports both get and put of the serverless event
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
Handles the raw serverless request
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

**Returns:** HTTP request body. If body is a JSON string, the string will be parese to Object

## req.params 

> **Type:** Object 
> 
> **Returns:** a key value pairs of url parameters

## req.path 

> **Type:** Object 
> 
> **Returns:** a key value pairs of url path parameters

## req.headers 

> **Type:** Object 
> 
> **Returns:** a key value pairs of request headers




# Res Object

## res.headers([headers])

Get and Set the headers 
> **Type:** Function
> 
> **Param 'headers':**  A key/val object to set response headers.
> 
> **Returns:** currently set header object

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

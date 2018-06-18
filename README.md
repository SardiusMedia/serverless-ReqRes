# serverless-ReqRes

A lightweight (5kb) "ExpressJS like" Request and Response handler (with plugin support) for AWS lambda functions.

Please review [Our Serverless Best Practices](#serverless-best-practices]) to speed up (or eliminate ) cold starts, reduce memory usage, and overall speed up requests, by separating your endpoints into separate lambda functions rather than handling everything in one route.

## Getting Started

Install it via npm:

```shell
npm install serverless-req-res --save
```

And include in your project:

```javascript
var reqRes = require('serverless-req-res');
```

Get the Res and Req handlers:

```javascript
//file: handler.js
//serverlessEndpoint.com/getExample?userName=fooBar
var reqResHandler = reqRes((req,res,rawServerlessEvent)=>{
  res.json({
    hello: req.query.userName
  })
})


module.exports = {
  get:reqResHandler.run //NOTE! .run is passed as the handler!!!
}
```

**NOTE!** you must pass **.run** to create your request handler or as the last call on your reqRes object you created

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
This reqRes will call the lambda callback as
```javascript
callback(null,{
	statusCode:200,
	headers:{
    	"Content-Type":"application/json"
    }
    body:"{\"hello\":\"fooBar\"}"
})
```
## Table Of Contents

- [serverless-ReqRes](#serverless-reqres)
  * [Some more Examples](#some-more-examples)
  * [Plugins and .before()](#extendable-with-plugins-and-before---)
    + [Inline Plugins/befores](#inline-plugins-befores)
    + [Global Plugins](#global-plugins)
  * [ServerlessEvent Object](#serverlessevent)
- [ReqRes Module](#reqres-module)
  * [Constructor](#constructor)
  * [Plugin Constructor](#plugin-constructor)
  * [before](#before)
  * [finally](#finally)
  * [catch](#catch)
  * [context](#context)
  * [event](#event)
  * [run](#run)
- [Req Object](#req-object)
  * [req.query](#reqquery)
  * [req.body](#reqbody)
  * [req.params](#reqparams)
  * [req.path](#reqpath)
  * [req.headers](#reqheaders)
- [Res Object](#res-object)
  * [res.headers](#resheaders-header-key-header-value----or--resheaders-object-)
  * [res.end](#resend--)
  * [res.send](#ressend-statuscode-int--body-string---or--ressend-body-string-)
  * [res.redirect](#resredirect-url-string-)
  * [res.json](#resjson-statuscode-int--body-object---or--resjson-body-object-)
  * [res.jsonp](#resjsonp-statuscode-int--body-object--callback-string---or--resjsonp-body-object--callback-string-)
  * [res.error](#reserror-javacript-error---or--reserror-object-)
- [Serverless Best Practices](#serverless-best-practices)
    + [Keep Your Lambda Functions as Small as Possable](#keep-your-lambda-functions-as-small-as-possable)
      - [Minify Your Lambda Functions](#minify-your-lambda-functions)
      - [Scope your require() (or import) inside your handler(s)](#scope-your-require----or-import--inside-your-handler-s-)
    + [Split Logic out of the Handler's Requests/Responses](#split-logic-out-of-the-handler-s-requests-responses)
    + [ReqRes Global Plugins](#reqres-global-plugins)
  * [Keep Lambda Hot with A Schedule and Input "ReqRes_KEEP_HOT"](#keep-lambda-hot-with-a-schedule-and-input--reqres-keep-hot-)


## Some more Examples
### get URL Query Paramiters

```javascript
console.log(req.query)
```

### get URL Path Paramiters

```javascript
console.log(req.path)
```

### get Request headers

```javascript
console.log(req.headers)
```


### get Request Body

```javascript
console.log(req.body)
```

### set Response headers

Add to the headers
```javascript
res.headers("foo","bar")
console.log(res.headers())
```
Overwrite headers by passing an object
```javascript
res.headers({
  "foo":"bar"
  "Content-Type":"text/html"
})
console.log(res.headers())
```

### Return Html/Strings

```javascript
res.send("<html><body>hi</body</html>")
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


### use .finally([mainFunctionReturn]) to run after main reqRes function
.finally() is not recommended, but can be used to close anything after the main reqres callback has been called
any value returned in the main reqres function will be passed to the finally function as the first parameter

Note that req and res are not being sent as it is recommended you handle your response inside the main function. If req is necessary you can always return it in your main function

Here is an example of closing a db connection after sending a success
```javascript
//store a function to be used with all handlers
let closeDB = (MainFuncReturnData)=>{
	//Note: main function (above) returned a promise
	MainReqResReturnData
    .then((db)=>{ //promise passed  the db on fulfill
    //close the db to end the lambda function
    db.close()
   })
}

reqResHandler = reqRes((req,res)=>{
	var info = req.body
    //return anything to the finally function
    //in this case we are returning a proimse
    return new Promsie((fulfill, reject)=>{
    	var db = DB.connect()
        db.updated(req.path.ID).then(()=>{
        	res.send("example sotred in db")
            fulfill(db)
        })
    })
})
//call the closeDB function
.finallly(closeDB)
.run
```


## Extendable with Plugins and .before()!


### Inline Plugins/befores
**you can use [.before()](#before) to extend a single function Or, you can set an array of plugins to run when creating a new ResReq**

include the plugins module

```javascript
var reqRes = require('serverless-req-res');
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
let reqResHandler = reqRes((req,res)=>{
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
var handler = reqRes((req, res,rawServerlessEvent)=>{
  req.stack.push("Finally")
  //use our plugin
  res.json({
    message:"the stack is",
    stack:req.stack
  });
})
//Pass Object to add to req, (or res) objects
.before({
  req:{
    stack:[]
  }
})
//when object without req or res is passed then it will add all attributes to the req object
.before({stack:[]}) //same as above
//Passing a function that returns a Proimise will wait unfil it is resolved before running any other "before"
.before((req,res,rawServerlessEvent)=>{
  return new Promise((fulfill,reject)=>{
    setTimeout(()=>{
      req.stack.push("First")
      fulfill()
    },1000)
  })
})
.before((req,res,rawServerlessEvent)=>{
  req.stack.push("Second")
})
.catch((errors, req,res, rawServerlessEvent)=>{
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

### Global Plugins
Global plugins will run  before any befores and your main ReqRes function. The same waterfall rules as the plugin function (defined above) still apply.

Please review [ReqRes Global Plugins](#reqres-global-plugins) for best practice for using global plugins in larger code bases.

#### Register a Global Function
**reqRes("plugin", {pluginName:String}, {plugin:Function})**

A Simple plugin:
```javascript
reqRes("plugin","pluginName", (req,res,rawServerlessEvent)=>{
	req.works = true
})
```

A async plugin:
```javascript
reqRes("plugin","plugin1", (req,res,rawServerlessEvent)=>{
	return new Promise((fulfill,reject)=>{
    	req.works = true;
        fulfill()
    })
})
```

A Promse.all async plugin

```javascript
reqRes("plugin", plugin2",
	[
      //note the timeout
      (req,res,rawServerlessEvent)=>{
          return new Promise((fulfill,reject)=>{
          req.stack += "2"
          setTimeout(fulfill,1000)
      },
      (req,res,rawServerlessEvent)=>{
          return new Promise((fulfill,reject)=>{
          req.stack = "1";
          fulfill()
      },
  ]
)
//note after promse.all req.stack will be "12"
```

Running a reqRes function will result in both plugins running automatically in the order the where defined and with waterfall support.
```javascript
reqRes((req,res)=>{
	//sends {works:true} (req.stack is undefined as it was excluded)
	res.json({works:req.works,stack:req.stack}})
})
```
Returns: ``` {works:true, stack:"12"} ```

#### Filtering Global Plugins Per ReqRes request
It is possable to filter global plugins for a single request with the plugins function or the excludePlugins funtion

**EX:**  Only run plugin1 (defined above) using the plugins function with an array of plugin names (as strings)
```javascript
reqRes((req,res)=>{
	res.json({works:req.works,stack:req.stack})
})
.plugins(["plugin1"])
```
Returns: ``` {works:true} ``` Note that req.stack (set in plugin2) is undefined as it was excluded.

**EX:** Only run plugin1 (defined above) using the plugins function with an array of plugin names (as strings)
```javascript
reqRes((req,res)=>{
	res.json({works:req.works,stack:req.stack})
})
.excludePlugins(["plugin1"])
```
Returns: ``` {stack:"12"} ```
Note that req.works (set in plugin1) is undefined as it was excluded.

#### Filtering Global Plugins Per ReqRes request By defining Sub-Sets
Defining subsets of global plugins allows you to define a set of global plugins that may be uses in many different handlers

**reqRes("plugin.subset", {pluginSetName:String}, {plugin:Function})**
 
```javascript
//Define Some Plugins
reqRes("plugin","p1",(req)=>{req.p1 = true})
reqRes("plugin","p2",(req)=>{req.p2 = true})
reqRes("plugin","p3",(req)=>{req.p3 = true})
//define the subset
reqRes("plugin.subset","pSet1",["p1", "p2"])

let handler = reqRes((req,res)=>{
	res.json(req)
})
//pass the plugin subset name as a string into the plugins function
.plugins("pSet1")
.run

```

*returns*
```
{
	p1:true,
    p2:true
}
```
If ```.plugins("pSet1")``` was not called, all global plugins would run and the the data would be 
```
{
	p1:true,
    p2:true,
    p3:true
}
```


## ServerlessEvent
In examples shown with 'rawServerlessEvent' ([constructor](#constructor), [before()](#before), [plugins](#extendable-with-plugins-and-before)) The object is the raw Serverless Event as an Object
```
  {
    event:Object
    context:Object
    callback:Function
  }
```


# ReqRes Module

[ReqRes(Callback)](#constructor) Your main function to get access to res and req objects

[ReqRes("plugin", String, Callback)](#global-plugins) Register A global plugin

[ReqRes("plugin.subset", Callback)](#global-plugins) Register A global plugin Sub Set Filter

[ReqRes.plugins(ARRAY(Callback|Object))](#plugin-constructor) Run Plugin functions passed as Object {req,res} or functions to run before the main callback.

[ReqRes.plugins(ARRAY(GlobalPluginName:String))](#plugin-constructor) Filter to include only global functions of global functions with the same name (unknown plugins will be ignored and will not throw an error)

[ReqRes.plugins(GlobalPluginSubSetName:String))](#plugin-constructor) Filter to include only global functions that you defined globally

[reqRes.before(Callback|Object)](#before) runs a callback before main function

[reqRes.finally(Callback)](#finally) runs a callback after main function has ran

[reqRes.catch(Callback)](#catch) catch plugin or .before errors along with your main [constructor function](#constructor)

[reqRes.context(Object)](#context) set raw serverless contex

[reqRes.event(Object)](#event)  set raw serverless event

[reqRes.run(rawServerlessEvent, rawServerlessContex, rawServerlessCallback)](#run) handle raw serverless function call

## Constructor

```javascript
var reqResHandler = reqRes(
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

### Inline/Chainable Plugins
```javascript
//fake auth plugin
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
yourReqResHandler.plugins([authplugin]);
```




### Global plugins
Global plugins will run first (in order they where created) on every request, unless filtered out by reqResHandler.plugins or reqResHandler.excludePlugins
```javascript
//fake auth plugin
//first param is string name of your plugin,
//second param is the callback to run apon a ReqRes request
reqRes("plugin", "fakeAuth", (req, res, rawServerlessEvent)=>{
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
```


#### Including Only selected Global plugins
you can use plugins function to only run plugins passed by an array of strings
```javascript
reqResHandler.plugins(["pluginNmae1", "pluginName2"]);
```

## excludePlugins
To exclude global functions pass a string array of plugin names to exclude them from running
```javascript
yourReqResHandler.excludePlugins(["fakeAuth"]);
```
**Note:** Plugins are not chanable and return undefined. You cannot use .before or any of the fallowing functions

## before
```javascript
reqResHandler.before((req,res,rawServerlessEvent)=>{
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


//set req or res attuibutes via object
.before({
	req:{setReqTest:"test"}
    res:{setResTest:"test"}
})
//set req attuibutes  (by default) via object
.before({
	setReqTest:"test"
})
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

## finally
```javascript
reqResHandler.finally((db)=>{
 db.colse()
})
```
Chainable Functions  to run (synchronously) after main function
the first parameter in the callback is what ever the main reqres callback returns
> **Type:** Function
>
> **Param 'Callback':** Function to run before your main function (usefull for exdending the req or res objects)
>
> **Returns:** resReq

Example:
```javascript

//set req.server
reqRes((req,res)=>{
	return "finished"
})
.finally((returnedData)=>{
	//logs "finished"
	console.log(returnedData)
})
```


## catch

```javascript
reqResHandler.before((req,res)=>{
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
        "stack": "ReferenceError: undefinedVar is not defined at reqResHandler.before.req.stack ({above}}.js:2:4)  
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



## context
```javascript
reqResHandler.context({callbackWaitsForEmptyEventLoop: false})
console.log(reqResHandler.context())
```
set defulats for the serverless context befure .run
> **Type:** Function
>
> **Param 'contex':** If set, it will update the context
>
> **Returns:** contex (if parameters are empty) or undefined

## event
```javascript
reqResHandler.event({headers: {}})
console.log(reqResHandler.event())
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


## res.end()

When Called this will stop any future before()s, plugins, or the main callback

If data has not been send yet (ex: res.send, res.json ect. (defined below) has not been called) A 200 response will be passed with an empty body

> > **Type:** Function
>
> **Param 'headers':**  A key/val object to set response headers.
>
> **Returns:** undefined

**NOTE:** All function below return end() for method chaining if desired

## res.send(StatusCode:int, Body:String) *OR* res.send(Body:String)

**fulfill the lamba function with a String/text response**

> **Type:** Function
>
> **Param 'Body':**  Return this String to serverless
>
> **Prams 'statusCode' (Optinal):** Set the http response code, Defualts to 200  
>
> **Returns:** Object with function end() to stop any future before()s, plugins, or the main callback


## res.redirect(URL:String)

**fulfill the lamba function with a the location header set to the url you pass object**

> **Type:** Function
>
> **Param 'URL':**  Return this url to serverless to redirect to it
>
> **Returns:** Object with function end() to stop any future before()s, plugins, or the main callback
>


## res.json(StatusCode:int, Body:Object) *OR* res.json(Body:Object)

**fulfill the lamba function with a Json object**

> **Type:** Function
>
> **Param 'Body':**  Return this Object to serverless
>
> **Prams 'statusCode' (Optinal):** Set the http response code, Defualts to 200  
>
> **Returns:** Object with function end() to stop any future before()s, plugins, or the main callback
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
>
> **Returns:** Object with function end() to stop any future before()s, plugins, or the main callback

## res.error(Javacript Error) *OR* res.error(Object)

fulfill the lamba function with an JS Thrown Error or Object;

if Thrown Error is past serverless will be called back with json body

```javascript
{stack:"String of Stack trace", message:"error message"}

```

If an object is past it will return your custom error object as jason body

> **Type:** Function
>
> **Returns:** Object with function end() to stop any future before()s, plugins, or the main callback


## res.handle(Promise [, Headers])

Waits for proimsie to resolve before fullfilling the response (res.json) or displaying error (res.error)
> **Type:** Function
>
> **Param 'Promise**':  A JS Promise
>
> **Pram 'Headers' (Optinal):** key/value object of headers to set  
>
> **Returns:** serverless callback parameters



**Returns:** serverless callback parameters




# Serverless Best Practices

### Keep Your Lambda Functions as Small as Possible

#### Minify Your Lambda Functions

Reducing the file size of your AWS Lambda Functions allows AWS to provision them more quickly, speeding up the response time of your Lambdas. Smaller Lambda sizes also helps you develop faster because you can upload them faster. Furthermore, smaller lambdas may reduce memory usage.  There are many Serverless plugins for minifying your lambda functions before publishing to AWS. We Recomend [serverless-plugin-optimize](https://www.npmjs.com/package/serverless-plugin-optimize)


#### Scope your require() (or import) inside your handler(s)
**If you are using a single handler.js file**, make sure to include any modules needed inside the handler. The Lambda minifiers compile  only the modules you require for that single lambda function to run, but also will compile  any modlues scoped outside of the handler.

**If you are using a single handler for multiple routes**, You may want to stay away from any tools that handle routes for you. Most tools like these will compile  all your code into one huge function, And slow down just about everything.
##### Quick Example
Note where the require is being called

**Good:**
```javascript
reqRes((req,res)=>{
    //scope postData inside this hanlder
	let foo = require("./bar");
	foo(req.path.id,req.body);
}).run
```
**Bad:**
```javascript
//scope postData Outside the hanlder
let foo = require("./bar")
reqRes((req,res)=>{
	foo(req.path.id,req.body);
}).run
```
##### Detailed Example

In this example the minifer will add the db module to both the getTime and postData lambda functions
File: /handlers.js
```javascript
//db is scoped outside of the halder logic
let db = require("./db")

//this one line function will now have the db module
let getTime = reqRes((req,res)=>{
	res.send(Date.now())
}).run

let postData = reqRes((req,res)=>{
	let data = req.body;
    let id = req.path.userID
    db.upsert(id, data).then(res.json).catch(res.error)
}).run

//send the object to be used in serverless.yaml
module.exports = {
	getTime,
    postData
}

```

As you can see, the getTime function now will have access to db module, because it is scoped to have access to db module in RAW javascript. This is only using one require but may turn this one line function to get a timestamp to require a db module to be loaded in.

Instead require modules inside your handler
In this example the minifer will add the db module to both the getTime and postData lambda functions
File: /handlers.js
```javascript
//let db = require("./db") //remove this and move it to postData

//this one line function will now have the db module
let getTime = reqRes((req,res)=>{
	res.send(Date.now())
}).run

let postData = reqRes((req,res)=>{
    //scope db into this hanlder
	let db = require("./db")
	let data = req.body;
    let id = req.path.userID
    db.upsert(id, data).then(res.json).catch(res.error)
}).run

//send the object to be used in serverless.yaml
module.exports = {
	getTime,
    postData
}
```



### Split Logic out of the Handler's Requests/Responses
This may be obvious, but It is important to think of your lambda functions as independent from an http request/response. This helps in few ways:
1. Function reusablity. You may have single Lambda that does a single task. but down the road you many need that functionality in another lambda function.
2. You may want to use your code outside of lambda, or inside a serverless schedule.
3. improve code readability, its easy to read your handler file if each handler looks almost exactly the same, and with a good folder structure you don't even need to look at your handler file to make changes to your function.

Let's take the postData exmaple

File: src/handlers.js
```javascript
let postData =reqRes((req,res)=>{
    //scope db into this hanlder
	let db = require("./db")
	let data = req.body;
    let id = req.path.userID
    db.upsert(id, data).then(res.json).catch(res.error)
}).run
```

This works but it may get a bit more complex so you split it into a module

File: src/postData.js
```javascript
let db = require("./db")

module.exports = (req,res)=>{
	let data = req.body;
    let id = req.path.userID

    //its more complex now

    db.upsert(id, data)
    	.then(res.json)
        .catch(res.error)
}
```

File: src/handlers.js
```javascript
let postData = reqRes((req,res)=>{
    //scope postData inside this hanlder
	let dbPost = require("./postData")
	dbPost(req,res)
}).run
```
Well, This still works and our handler is very simple! But... to call the db function we are dependent on the req and res variables we passed.If we need to call this outside of an http request, we need to fake the req,res functions, which isn't a great workaround.

Instead Use the handler to validate paramiters (if needed) and send the paramiters to the lambda independent function

Independent Module: src/postData.js
```javascript
let db = require("./db")
module.exports = (id,data)=>{
   //return the promise
   return db.upsert(id, data)
}
```

File: src/handlers.js
```javascript
let postData = reqRes((req,res)=>{
    //scope postData inside this hanlder
	let db = require("./postData")
    //pass variables not req,res
	db(req.path.id,req.body)
    	.then(res.json)//then handel the response
        .catch(res.error)
}).run
```

This example was a overly simplistic, but, Now we can use ```let db = require("./postData")``` any way we want. This also helps "black box" functions to be used by anyone on a team and without using serverless http events. And with a good folder structure we easily know where to go to fix an issue or add a feature.

### ReqRes Global Plugins
If your are using ReqRes global plugins,  it is recommended to create a custom ReqRes module to include in all handler files. This makes it easier to modify your plugins and inclued a single module into multiple handler files.

**Your ReqRes module** EX: YOUR_PROJECT/src/libs/ReqRes/index.js
```javascript
var reqRes = require('serverless-req-res');
//store plugin functions in another module
reqRes("plugin1",require('./plugin1'))
//OR
//define them as normal ReqRes callback function
reqRes("plugin2", (req,res,rawServerlessEvent)=>{
	return new Promise((fulfill,reject)=>{
    	req.works = true;
        fulfill()
    })
})
//export ReqRes
module.exports = ReqRes;
```
**Your Handler file** EX: YOUR_PROJECT/src/handler/endpoint.js

```javascript
var reqRes = require('./../libs/ReqRes');
var reqResHandler = reqRes((req,res,rawServerlessEvent)=>{
  //sends 200 with body "true"
  res.send(req.works)
})
module.exports = reqResHandler.run;
```  

## Keep Lambda Hot with a Schedule and Input "ReqRes_KEEP_HOT"

**WARING:** This MAY increase your AWS bill (but not by a lot, if you are paying for one)

To keep your Lambda instance hot and reduce slow cold startups you can add ReqRes_KEEP_HOT:true as in input in a schedule for your function

When ReqRes_KEEP_HOT is true, ReqRes will not run any of your code but will exit as soon (under the Lambda's 100ms minimum charge time) as possible with a 200 json response of:

```
{
     keepingHot:true,
     message:"ReqRes plugin stopped before running any before()s plugins or the main handler, as 'ReqRes_KEEP_HOT' was true for this sechduled request"
}

```

Example of using ReqRes_KEEP_HOT in a schedule
```
functions:
  getExample:
    handler: src/handler.get
    description: an example of useing ReqRes
    events:
      - http:
          method: GET
          path: getExample
   - schedule:
          name: 'REQ_RES_KEEP_HOT_EXAMPLE'
          rate: rate(15 minutes)
          enabled: true
          input:
            ReqRes_KEEP_HOT: true
```
## License

MIT

# Lambda-ReqRes

A light weight Express like Request and Response handler for lambda functions

## Getting Started

Install it via npm:

```shell
npm install Lambda-ReqRes --save
```

And include in your project:

```javascript
const ReqRes = require('Lambda-ReqRes');
```

Get the Res and Req handlers:

```javascript
//lambdaEndpoint.com?userName="fooBar"
let reqRes = new ReqRes((req,res)=>{
  res.json({
    hello: req.params.userName
  })
})

//point to this module in your serverless.yaml file
module.exports = reqRes.run

```

## Some Examples

### get Request headers

```
console.log(req.headers)
```

### set Request headers

```
res.headers({"foo":"bar"})
console.log(res.headers())
```

### Return json

```
res.json({
  works:true;
})
```

### Handel a JS Error
Returns a 400 json response with error message and stack trace 
```
try{
 var1.anUndefinedVar = aNotherUndefinedVar;
}catch(e){
  res.error(e)
}
```
# ReqRes Module
Ex: ``` reqRes = new ReqRes((req,res)=>{...})```
.run(event, contex, callback)
.context(([contex])
.event([event])
.before(Callback|Object)
.catch(Callback)



## reqRes.run(event, contex, callback)
Handles the raw lambda request
> **Type:** Function
> 
> **Param 'event':**  Lambda's request event
> 
> **Param 'contex':**  Lambda's contex
> 
> **Param 'callback':** the lambda function to output 
> 
> **Returns:** currently set header object

## reqRes.context([contex]);
supports both get and put of the lambda contex
> **Type:** Function
> 
> **Param 'contex':** If set, it will update the context 
> 
> **Returns:** contex (if parameters are empty)

## reqRes.event([event])

supports both get and put of the lambda event
> **Type:** Function
> 
> **Param 'event':** If set, it will update the context 
> 
> **Returns:** event (if parameters are empty)

## reqRes.before(Callback|Object)
Chainable Functions  to run (synchronously) before main function 
> **Type:** Function
> 
> **Param 'Callback':** Function to run before your main function (usefull for exdending the req or res objects) 
> 
> **Returns:** null


Examples
```

//
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

## ReqRes.catch(Callback)
Catches any errors in any of the .before functions
> **Type:** Function
> 
> **Param 'Callback':** Function that runs (after all befores have ran) and one or more befores threw a Promse reject   
> 
> **Returns:** null
Example 

```
reqRes.before((req,res)=>{
    undefinedVar.value = 12345;
})
.catch((errors, req, res)=>{
  res.error(errors)
})
```

# *Req Object*

## req.query 

> **Type:** Object 
> 
> **Returns:** a key value pairs of query parameters

## req.body 

**Type:** String | Object 

**Returns:** Post/put body. If body is a JSON string, the string will be parese to Object

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

## res.handle(PROMISE [, HEADERS])

Waits for proimsie to resolve before fullfilling the response (res.json) or displaying error (res.error) 
> **Type:** Function
> 
> **Param 'Promise**':  A JS Promise
> 
> **Pram 'HEADERS' (Optinal):** key/value object of headers to set  
> 
> **Returns:** lambda callback parameters


## res.json(StatusCode:int, Body:Object)

### OR res.json(Body:Object)

**fulfill the lamba function with a Json object** 

> **Type:** Function
> 
> **Param 'Body':**  Return this Object to lambda
> 
> **Prams 'statusCode' (Optinal):** Set the http response code, Defualts to 200  
> 
> **Returns:** lambda callback parameters

## res.error(Javacript Error) *OR* res.error(Object)

fulfill the lamba function with an JS Thrown Error or Object;

if Thrown Error is past lambda will be called back with json body

``` {stack:"String of Stack trace", message:"error message"} ``` 

If an object is past it will return your custom error object as jason body

> **Type:** Function
> 
> **Returns:** lambda callback parameters

## res.json(StatusCode:int, Body:String)

### OR res.json(Body:String)

fulfill the lamba function with a string (such as html)

> **Type:** Function
> 
> **Param 'Body':**  Return this string to lambda
> 
> **Prams 'statusCode' (Optinal):** Set the http response code, Defualts to 200  
> 


**Returns:** lambda callback parameters

## License

MIT

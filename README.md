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
let A_Lambda_Handler = (event, context, callback) => {
	{req, res} = new ReqRes(event, context, callback);
    //... Examples (below) here

```

Non-ES6
```javascript
	var reqRes = new ReqRes(event, context, callback);
	var req = reqRes.req;
	var res = reqRes.res;
  //... Examples (below) here
```


## Examples

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

### Return JS Error

```
try{
 var1 = anUndefinedVar;
}catch(e){
  res.error(e)
}
```


### Let Proimises handle everything
```
//a async function to query something
var query = (queryString)=>{
  return new Promise((fulfill)=>{
    setTimeout(()=>{
      fulfill(queryString)
    },1000)
  })
}
//call function with url query params from requester
res.handle(query(req.query))

```

### Handel Proimise Errors
```
//a async function to query something
var query = (queryString)=>{
  return new Promise((fulfill,reject)=>{
    setTimeout(()=>{
      var1 = anUndefinedVar;
    },1000)
  }).catch(reject)
}
//call function with url query params from requester
res.handle(query(req.query))

```

# *Req Object*

## req.query 

> **Type:** Object 
> 
> **Returns:** a key value pares of query parameters

## req.body 

**Type:** String | Object 

**Returns:** Post/put body. If body is a JSON string, the string will be parese to Object

## req.params 

> **Type:** Object 
> 
> **Returns:** a key value pairs of url parameters



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

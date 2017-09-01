# Lambda-ReqRes

![Build Status](https://img.shields.io/travis/mikeRead/Lambda-ReqRes.svg)
![Coverage](https://img.shields.io/coveralls/mikeRead/Lambda-ReqRes.svg)
![Downloads](https://img.shields.io/npm/dm/Lambda-ReqRes.svg)
![Downloads](https://img.shields.io/npm/dt/Lambda-ReqRes.svg)
![npm version](https://img.shields.io/npm/v/Lambda-ReqRes.svg)
![dependencies](https://img.shields.io/david/mikeRead/Lambda-ReqRes.svg)
![dev dependencies](https://img.shields.io/david/dev/mikeRead/Lambda-ReqRes.svg)
![License](https://img.shields.io/npm/l/Lambda-ReqRes.svg)

A light weight Express like Request and Response handler for lambda functions

## Getting Started

Install it via npm:

```shell
npm install Lambda-ReqRes
```

And include in your project:

```javascript
const ReqRes = require('Lambda-ReqRes');
```

Get the Res and Req handlers:

```javascript
A_Lambda_Handler = (event, context, callback) => {
	{req, res} = new ReqRes(event, context, callback);
    ...
```


## License

MIT

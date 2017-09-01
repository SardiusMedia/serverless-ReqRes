'use strict';

//var helpers = require("./helpers")
module.exports = function(event, context, cb, options) {
    var _headers = {}
    //context.callbackWaitsForEmptyEventLoop = false
    //send html
    var send = (statusCode, body) => {
        if(typeof body == "undefined"){
            body = statusCode;
            statusCode = 200;
        }

        if(typeof object == "object"){
            try{
                object = JSON.parse(object)
            }catch(e){
               return error({message: "halder.json was passed an unparsable string", parseError:e.message})
            }
        }

        cb(null, {
            statusCode: statusCode,
            headers:_headers,
            body: body,
        });
    }

    //send json
    var json = (statusCode, object) => {
        if(typeof object == "undefined" && typeof statusCode != "undefined"){
            object = statusCode;
            statusCode = 200;
        }

        var callback = false;
        if(event.queryStringParameters){
            if(event.queryStringParameters.callback){
                callback =  event.queryStringParameters.callback
            }
            else if(event.queryStringParameters.cb){
                callback =  event.queryStringParameters.cb
            }
        }
        
        if(!callback){
            send(statusCode, JSON.stringify(object))
        }
        else{
            send(statusCode, callback+'('+JSON.stringify(object)+');')
        }
        
    }

    var error = (err) => {
        if(err instanceof Error){
            json(400,{message:err.message, stack:err.stack}); 
          //throw(err) 
        }else{
            json(400, err); 
        }
    }

    var redirect = (Location)=>{
        cb(null, {
            statusCode: 301,
            headers: {
               Location
            },
            body: '',
        });
    }

    var handle = (aProimse)=>{
        try{
            Promise.resolve(aProimse).then(json).catch(error)
        }catch(e){
            error(e)
        }
    }

    var resHeaders = (headers)=>{
        if(typeof headers !== "undefined")
            _headers = headers;
        return _headers;
    }

    var resHeader = (header)=>{
         if(typeof headers !== "undefined")
            _headers = Object.assign(_headers, header);
    }


    var query = event.queryStringParameters || {}
    var body = ""
    var params = event.pathParameters || {}
    var accountId = null;
    var headers = event.headers


    if(event.body){
        body = event.body;
        try{
            body = JSON.parse(body)
        }catch(e){}
    }
    
    return {
        req:{
            query,
            body,
            params,
            headers
        },
        res:{
            send,
            json,
            redirect,
            error,
            handle,
            headers:resHeaders,
            header:resHeader
        },
    };
}

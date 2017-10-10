let _resReqPlugins = {};
var _plugins = {
    add: (key,callback) => {
        if(key.toLowerCase().trim() == "plugin"){
           key = "plugin_"+Object.keys(_resReqPlugins).length; 
        }
        _resReqPlugins[key] = callback;
    },
    get: (pluginKeys) => {
        var pluginReturn = [];
        var allkeys = Object.keys(_resReqPlugins)
        
        var returnAll = false;
       
        if(typeof pluginKeys == "undefined"){
            returnAll = true;
        }
        else if(Array.isArray( pluginKeys) && pluginKeys[0] == "*"){
            returnAll = true
        }

        
        for(var i = 0; i<allkeys.length; i++){
            var key = allkeys[i];
            
            if(returnAll || pluginKeys.indexOf(key)>=0){
                pluginReturn.push(_resReqPlugins[key])
            }
        }

        return pluginReturn;
    }
};

var _ReqRes = function _ReqRes(event, context, callback) {
    var _headers = {};
    var update = serverlessObject => {
        event = serverlessObject.event, context = serverlessObject.context;
    };
    //context.callbackWaitsForEmptyEventLoop = false
    //send html
    var send = (statusCode, body) => {
        if (typeof body == "undefined") {
            body = statusCode;
            statusCode = 200;
        }

        if (typeof body == "object") {
            try {
                body = JSON.parse(body);
            } catch (e) {
                return error({ message: "halder.json was passed an unparsable string", parseError: e.message });
            }
        }
        
        if(!_headers['Content-Type']){
            if(body.indexOf("<html>")>=0){
               _headers['Content-Type'] = "text/html" 
            }
            else{
                _headers['Content-Type'] = "text/plain" 
            }
            
        }

        callback(null, {
            statusCode: statusCode,
            headers:_headers,
            body: body
        });
    };

    //send json
    var json = function json(statusCode, object) {
        let cb = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        if (typeof object == "undefined" && typeof statusCode != "undefined") {
            object = statusCode;
            statusCode = 200;
        }

        if (typeof cb != "string" && event.queryStringParameters) {
            if (event.queryStringParameters.callback) {
                cb = event.queryStringParameters.callback;
            } else if (event.queryStringParameters.cb) {
                cb = event.queryStringParameters.cb;
            }
        }

        if (!cb) {
            _headers['Content-Type'] = 'application/json'
            send(statusCode, JSON.stringify(object));
        } else {
            _headers['Content-Type'] = 'application/javascript'
            send(statusCode, cb + '(' + JSON.stringify(object) + ');');
        }
    };
    var jsonp = (statusCode, object, cb) => {
        if (typeof object == "undefined" && typeof statusCode != "undefined") {
            object = statusCode;
            statusCode = 200;
            cb = "callback";
        } else if (typeof object == "string" && typeof statusCode != "undefined") {
            object = statusCode;
            statusCode = 200;
            cb = object;
        }
        json(statusCode, object, cb);
    };
    var error = (statusCode, err) => {
         if (typeof err == "undefined") {
            err = statusCode;
            statusCode = 400;
        }
        if (err instanceof Error) {
            json(statusCode, { message: err.message, stack: err.stack });
            //throw(err) 
        } else {
            json(statusCode, err);
        }
    };
    
    var setHeader = (key,val)=>{
        if(typeof key == "object"){
            _headers = key
        }else if(typeof key !== "undefined" && typeof val !== "undefined"){
            _headers[key] = val
        }
        return _headers
    }

    var redirect = Location => {
        callback(null, {
            statusCode: 301,
            headers: {
                Location: Location
            },
            body: ''
        });
    };

    var handle = aProimse => {
        try {
            Promise.resolve(aProimse).then(json).catch(error);
        } catch (e) {
            error(e);
        }
    };

    var query = event.queryStringParameters || {};
    var body = "";
    var params = event.pathParameters || {};
    var accountId = null;
    var headers = event.headers;

    if (event.body) {
        body = event.body;
        try {
            body = JSON.parse(body);
        } catch (e) {}
    }

    return {
        update: update,
        req: {
            query: query,
            body: body,
            params: params,
            headers: headers
        },
        res: {
            send: send,
            json: json,
            redirect: redirect,
            error: error,
            handle: handle,
            headers:setHeader
        }
    };
};

module.exports = function (runCallback, pluginArray) {
   
    var _befores = [];
    var _catch = false;
    var _event = {};
    var _context = {};

    //this is a plugin
    if(typeof runCallback == "string"){
        _plugins.add(runCallback, pluginArray)
        return
    }

    if(typeof pluginArray == "undefined"){
        pluginArray = ['*']
    }


    this.run = (event, context, callback) => {
        event = Object.assign(event, _event);
        context = Object.assign(context, _context);
        this.Lambda = { event: event, context: context, callback: callback };

        var _ref = new _ReqRes(event, context, callback),
            req = _ref.req,
            res = _ref.res,
            update = _ref.update;

        if(!_catch){
            _catch = (errors, req, res)=>{
                res.error(errors)
            }
        }
        var pRomises;
        var plugins = _plugins.get(pluginArray);
        _befores = _befores.concat(plugins);

        if (_befores.length > 0) {

            var i = 0;
            var len = _befores.length;
            var hasErrors = false;
            function combine(newReq, newRes) {

                if (typeof newRes == "object") res = Object.assign(res, newRes);
                if (typeof newReq == "object") req = Object.assign(req, newReq);
            }

            var checkFulfill = () => {
                i++;
                update(this.Lambda);
                if (i == len) {

                    if (hasErrors && _catch) {
                        _catch(req.ReqResErrors, req, res, this.Lambda);
                    } else if (_catch) {
                        try {
                            runCallback(req, res, this.Lambda);
                        } catch (e) {
                            _catch([{
                                message: e.message,
                                stack: e.stack
                            }], req, res, this.Lambda);
                        }
                    } else {
                        runCallback(req, res);
                    }
                } else {
                    next();
                }
            };

            var next = () => {
                var before = _befores[i];

                if (typeof before == "function") {

                    before = before(req, res, this.Lambda);
                    //console.log("function")
                    Promise.resolve(before).then(checkFulfill).catch(error => {
                        hasErrors = true;
                        if (typeof req.ReqResErrors == "undefined") {
                            req.ReqResErrors = [];
                        }
                        if (error instanceof Error) {
                            req.ReqResErrors.push({ message: error.message, stack: error.stack });
                            //throw(err) 
                        } else {
                            req.ReqResErrors.push(error);
                        }

                        checkFulfill();
                    });
                } else {
                    //console.log(before)
                    combine(before.req, before.res);
                    checkFulfill();
                }
            };
            next();
        } else {
            runCallback(req, res);
        }
    };

    this.before = callback => {
        _befores.push(callback);
        return this;
    };

    this.catch = callback => {
        _catch = callback;
        return this;
    };

    this.event = event => {
        if (typeof event == "object") _event = Object.assign(_event, event);

        return _event;
    };

    this.context = context => {
        if (typeof context == "object") _context = Object.assign(_context, context);
        return _context;
    };



    return this;
};
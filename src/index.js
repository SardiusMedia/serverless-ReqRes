let _resReqPlugins = {};
//plugins handles storing and gettings all fuctions callbacks 
var _plugins = {
    // Function add 
        //register a plugin  
        // param key, String: the name of this plugin 
        // param callback, Function,
    add: (key,callback) => {
        if(key.toLowerCase().trim() == "plugin"){
           key = "plugin_"+Object.keys(_resReqPlugins).length; 
        }
        _resReqPlugins[key] = callback;
    },
    // Get array of plgins filtered by pluginKeys
    // Param: pluginKeys, String Array
    get: (pluginKeys, excludes) => {
        //the array of plugins to return 
        var pluginReturn = [];
        //the names of all current plugins 
        
        var returnAll = false;
        //if pluginKeys filter aray is not set send all plugins 
        if(typeof pluginKeys == "undefined"){
            returnAll = true;
        }
        //if the first item on the arry is a * then sned all plugins
        else if(Array.isArray( pluginKeys) && pluginKeys[0] == "*"){
            returnAll = true
        }

        if(returnAll){
            pluginKeys = Object.keys(_resReqPlugins)
        }

        for(var i = 0; i<pluginKeys.length; i++){
            var key = pluginKeys[i];

            if(Array.isArray(key)){
         
                var promises = []
                for(var j=0; j<key.length; j++){
                    var pKey = key[j];
                    if(excludes.indexOf(key) < 0){
                        promises.push(_resReqPlugins[pKey])
                    }
                }
                if(promises.length > 0){
                    pluginReturn.push(promises)
                } 
            }
            else if( excludes.indexOf(key) < 0) {
                pluginReturn.push(_resReqPlugins[key])
            }
        }
        return pluginReturn
    },
     get2: (pluginKeys, excludes) => {
        //the array of plugins to return 
        var pluginReturn = [];
        //the names of all current plugins 
        var allkeys = Object.keys(_resReqPlugins)
        //should return all plugins
        var returnAll = false;
        //if pluginKeys filter aray is not set send all plugins 
        if(typeof pluginKeys == "undefined"){
            returnAll = true;
        }
        //if the first item on the arry is a * then sned all plugins
        else if(Array.isArray( pluginKeys) && pluginKeys[0] == "*"){
            returnAll = true
        }

        //for each current plugin 
        for(var i = 0; i<allkeys.length; i++){
            //store the plugin name
            var key = allkeys[i];
            if(Array.isArray(key)){
                var promises = []
                for(var j=0; j<key.length; j++){
                    promises.push(_resReqPlugins[key])
                }
                pluginReturn.push(promises)
            }

            //store the plugin to return if
            //we want to return all plguins OR the plugin name is in pluginsKeys array
            else if((returnAll || pluginKeys.indexOf(key)>=0) && excludes.indexOf(key) < 0) {
                pluginReturn.push(_resReqPlugins[key])
            }
        }
        //return the arrays of plugins 
        return pluginReturn;
    }
};
//Private CLASS _ReqRes
//Hanles all Req and Res defulat functions uses when ReqRes.run 
//Prams event, context, and callback are the serverless event, context and callback 
var _ReqRes = function _ReqRes(event, context, callback) {
    var _headers = {};
    var update = serverlessObject => {
        event = serverlessObject.event, context = serverlessObject.context;
    };

    //Handels all defualt res handlers 
    //send text to browser (run serverless callback)
    var send = (statusCode, body) => {
        //if status code was not set, set the defualt to 2--
        if (typeof body == "undefined") {
            body = statusCode;
            statusCode = 200;
        }
        //if the body is a js obejct convert to json string
        if (typeof body == "object") {
            try {
                body = JSON.parse(body);
            } catch (e) {
                return error({ message: "halder.json was passed an unparsable string", parseError: e.message });
            }
        }
        //if  content-type is not set try to set it
        if(!_headers['Content-Type']){
            if(body.indexOf("<html>")>=0){
               _headers['Content-Type'] = "text/html" 
            }
            else{
                _headers['Content-Type'] = "text/plain" 
            }
            
        }
        //callback to serveless
        callback(null, {
            statusCode: statusCode,
            headers:_headers,
            body: body
        });
    };

    //send json
    var json = function json(statusCode, object) {
        //check if callback string was set
        let cb = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        //if status code is not set, set a defualt
        if (typeof object == "undefined" && typeof statusCode != "undefined") {
            object = statusCode;
            statusCode = 200;
        }
        //if no cb as set but there is a cd or callback in query params 
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
    //send JSONP
    var jsonp = (statusCode, object, cb) => {
        //if status code and callback where not defined
        //set defualts
        if (typeof object == "undefined" && typeof statusCode != "undefined") {
            object = statusCode;
            statusCode = 200;
            cb = "callback";
        } 
        //if status code was not set se tdfault satus code
        else if (typeof object == "string" && typeof statusCode != "undefined") {
            object = statusCode;
            statusCode = 200;
            cb = object;
        }
        //call json with callback 
        json(statusCode, object, cb);
    };
    //handle a JS error
    var error = (statusCode, err) => {
        //set defualt status code (if not set)
         if (typeof err == "undefined") {
            err = statusCode;
            statusCode = 400;
        }
        // try to parse and send js error
        if (err instanceof Error) {
            json(statusCode, { message: err.message, stack: err.stack }); 
        } 
        // send the error as normal
        else {
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
    //simple redirect
    var redirect = Location => {
        callback(null, {
            statusCode: 301,
            headers: {
                Location: Location
            },
            body: ''
        });
    };
    //handle a promise and run res.json or res.error
    var handle = aProimse => {
        try {
            Promise.resolve(aProimse).then(json).catch(error);
        } catch (e) {
            error(e);
        }
    };

    //REQ variables
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
    //return the private ReqRes class (to be used in module.exports Class)
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

module.exports = function (runCallback, plugin) {
    //array of callbacks from .befor()
    var _befores = [];
    var _excludes = [];
    //the catch callback function
    var _catch = false;
    //serverless event object
    var _event = {};
    //serverless context object
    var _context = {};
    var pluginArray = ['*']
    var _excludes = [];
    //initialize 
    
    
    //this is a plugin with the plugin name as a string for runCallback and pluginArray is the callback
    if(typeof runCallback == "string"){
        _plugins.add(runCallback, plugin)
        return
    }
   

    //serverless haderler
    this.run = (event, context, callback) => {
        
        //save the serverless event merged with any user overwrites
        event = Object.assign(event, _event);
        //save the serverless context merged with any user overwrites
        context = Object.assign(context, _context);
        //store the Serverless Object (to be passed to this ReqRes)
        this.Lambda = { event: event, context: context, callback: callback };
        //Create a new ReqRes Class to be called by the suer
        var _ref = new _ReqRes(event, context, callback),
            req = _ref.req,
            res = _ref.res,
            update = _ref.update;
        //set a defulat catch if user has not passed one
        if(!_catch){
            _catch = (errors, req, res)=>{
                res.error(errors)
            }
        }
        
        //get the array of plugins with a filter pluginArray
        var plugins = _plugins.get(pluginArray,_excludes);

        //merge the plugins into the array of befores
        _befores = plugins.concat(_befores);
        //loop though each .before and plugins
        if (_befores.length > 0) {
            //loop index
            var i = 0;
            //length of functions to run 
            var len = _befores.length;
            //flag for if a proimse failed
            var hasErrors = false;
            //merge any updates to res or req
            function combine(newReq, newRes) {
                if (typeof newRes == "object") res = Object.assign(res, newRes);
                if (typeof newReq == "object") req = Object.assign(req, newReq);
            }

            //fulfill this loop if loop has ended
            var checkFulfill = () => {
                //add one to loop index
                i++;
                //update the Serveless Object
                update(this.Lambda);
                //if all plugins and befores have ran
                if (i == len) {
                    //if any errors found and there is a catch function
                    if (hasErrors && _catch) {
                        //call the catch funcion
                        _catch(req.ReqResErrors, req, res, this.Lambda);
                    } else if (_catch) {
                        //if there is a catch function run the main reqRes in a try/catch
                        try {
                            //call the main function
                            runCallback(req, res, this.Lambda);
                        } catch (e) {
                            //callback to the .catch()
                            _catch([{
                                message: e.message,
                                stack: e.stack
                            }], req, res, this.Lambda);
                        }
                    } else {
                        //run the callback and we dont care what happens
                        runCallback(req, res);
                    }
                } else {
                    //loop hassent finished yet call next callback
                    next();
                }
            };

            var next = () => {
                //get the callback
                var before = _befores[i];
                //if the callabck is a functino
                if (typeof before == "function" || Array.isArray(before)) {
                    //run the function
                    
                    //wait for the promise (or object) is returned
                    var request
                  if(Array.isArray(before)){
                        var promises = []
                        for(var j = 0; j<before.length; j++){
                            promises.push(before[j](req, res, this.Lambda))
                        }
                        request = Promise.all(promises)
                    }
                    else{
                        request = Promise.resolve(before(req, res, this.Lambda))
                    }
                    
                    request.then(checkFulfill).catch(error => {
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
                        //handled next function/ end of loop
                        checkFulfill();
                    });
                } else {
                    //.before() was an object so meger into req,res obejcts
                    combine(before.req, before.res, this.Lambda);
                    checkFulfill();
                }
            };
            //start the loop
            next();
        } else {
            //no .befores or plugins
            runCallback(req, res, Lambda, this.Lambda);
        }
    };

    this.filterPlugins = pluginFilter =>{
        pluginArray = pluginFilter;
        return this
    }

    this.excludePlugins = excludePluginArray =>{
        if(typeof excludePluginArray == "string"){
            excludePluginArray = [excludePluginArray]  
        }
        _excludes = excludePluginArray
        return this;
    }

    //push a callback for the ResRes
    this.before = callback => {
         
        _befores.push(callback);
        return this;
    };
    //store a catch callback for errors
    this.catch = callback => {
        _catch = callback;
        return this;
    };
    //get/set serverless event object
    this.event = event => {
        if (typeof event == "object") _event = Object.assign(_event, event);

        return _event;
    };
    //get/set serverless context 
    this.context = context => {
        if (typeof context == "object") _context = Object.assign(_context, context);
        return _context;
    };

    return this;
};
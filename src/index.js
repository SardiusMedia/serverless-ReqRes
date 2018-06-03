

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
    }
};
//Private CLASS _ReqRes
//Hanles all Req and Res defulat functions uses when ReqRes.run
//Prams event, context, and callback are the serverless event, context and callback
var _ReqRes = function _ReqRes(event, context, lcallback) {
    var _headers = {};
    var _debugmode = false;
    var sent = false;
    var ended = false;
    var wasSent = ()=>{
        return sent
    }

    var end = () =>{
        if(!sent){
            send("")
        }
        ended = true;
    }

    var wasEnded = () =>{
        return ended
    }

    var update = serverlessObject => {
        event = serverlessObject.event, context = serverlessObject.context;
    };

    var callback = (param1, param2)=>{
        if(sent){
            return
        }
        sent = true;
        lcallback(param1,param2)
    }

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
                return error({
                  message: "halder.json was passed an unparsable string",
                  parseError: e.message
                });
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

        if(_debugmode){
              //callback to serveless
            callback(null, {
                statusCode: statusCode,
                headers:_headers,
                body: JSON.stringify( {
                    statusCode: statusCode,
                    headers:_headers,
                    body: body
                })
            });
        }
        else{
            callback(null, {
                statusCode: statusCode,
                headers:_headers,
                body: body
            });
        }

        return {end:end}

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
            return send(statusCode, JSON.stringify(object));
        } else {
            _headers['Content-Type'] = 'application/javascript'
            return send(statusCode, cb + '(' + JSON.stringify(object) + ');');
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
        return json(statusCode, object, cb);
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
            return json(statusCode, { message: err.message, stack: err.stack });
        }
        // send the error as normal
        else {
            return json(statusCode, err);
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
        if(sent){
            return
        }
        callback(null, {
            statusCode: 301,
            headers: {
                Location: Location
            },
            body: ''
        });
        return {end:end}
    };
    //handle a promise and run res.json or res.error
    var handle = aProimse => {
        try {
            Promise.resolve(aProimse).then(json).catch(error);
        } catch (e) {
            error(e);
        }
    };

    var debugMode = ()=>{
        _debugmode = true
    }

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
        wasSent:wasSent,
        wasEnded:wasEnded,
        req: {
            query: query,
            body: body,
            params: params,
            path:params,
            headers: headers
        },
        res: {
            send: send,
            json: json,
            redirect: redirect,
            error: error,
            handle: handle,
            headers:setHeader,
            debug : debugMode,
            end:end
        }
    };
};

let ReqResHandler = function (config, runCallback) {
    //array of callbacks from .befor()
    var _befores = [];
    var _excludes = [];

    var _defaultPlugins = Object.assign({},config.plugins)
    var _useDefaultPlugins = true;
    //the catch callback function
    var _catch = false;
    var _finally = false;
    //serverless event object
    var _event = {};
    //serverless context object
    var _context = {};
    var pluginArray = ['*']
    var _excludes = [];
    //initialize
    var _Serverless = {};
    var _end = false;
    var _corsUrl = false
    var _preflight = "POST, PUT, GET, OPTIONS, DELETE, PATCH, COPY, HEAD, LINK, UNLINK, PURGE, LOCK, PROPFIND, VIEW"

    //serverless haderler
    this.run = (event, context, callback) => {

        //save the serverless event merged with any user overwrites
        event = Object.assign(event, _event);
        //save the serverless context merged with any user overwrites
        context = Object.assign(context, _context);
        //store the Serverless Object (to be passed to this ReqRes)
        _Serverless = { event: event, context: context, callback: callback };
        //Create a new ReqRes Class to be called by the suer
        var _ref = new _ReqRes(event, context, callback),
            req = _ref.req,
            res = _ref.res,
            update = _ref.update;

        if(_corsUrl){
            res.headers( {
                "Access-Control-Allow-Origin":  _corsUrl,
                "Access-Control-Allow-Methods": _preflight
            })
        }

        if(typeof event["ReqRes_KEEP_HOT"] == "boolean" && event["ReqRes_KEEP_HOT"]){
            var message = {
              keepingHot:true,
              message:"ReqRes plugin stopped before running any before()s, plugins, finally, or the main handler, as 'ReqRes_KEEP_HOT' was true for this sechduled request"
            }
            console.log(message)
            res.json( message ).end();
            return
        }

        //set a defulat catch if user has not passed one
        function sendCatch(error){
            if(!_catch){
              res.error(error)
            }
            else{
              _catch(error, req, res)
              res.end()
            }
        }

        if(_useDefaultPlugins){
          var names = Object.keys(_defaultPlugins)
          var pls = [];

          for(var i=0; i<names.length; i++){
            pls.push(_defaultPlugins[names[i]])
          }
          _befores = pls.concat(_befores)
         // callback(null,  JSON.stringify(_befores))
        }
      /*  //get the array of plugins with a filter pluginArray
        var plugins = _plugins.get(pluginArray,_excludes);

        //merge the plugins into the array of befores
        _befores = plugins.concat(_befores);*/
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
                //break loop because a before sent a response
                if(_ref.wasEnded()){
                    return
                }
                //add one to loop index
                i++;
                //update the Serveless Object
                update(_Serverless);
                //if all plugins and befores have ran
                if (i == len || hasErrors) {
                    try {
                      //call the main function
                      cb = runCallback(req, res, _Serverless);

                      if(_finally){
                        try{
                          _finally(cb)
                        }catch(e){
                            console.log({message:e.message, stack:e.stack})
                        }
                      }
                    } catch (e) {
                        //callback to the .catch()
                      sendCatch(e)
                    }
                } else {
                    //loop hassent finished yet call next callback
                    next();
                }
            };

            var next = () => {

                if(_ref.wasEnded()){
                    return
                }

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
                            promises.push(before[j](req, res, _Serverless))
                        }
                        request = Promise.all(promises)
                    }
                    else{
                      try{
                        request = Promise.resolve(before(req, res, _Serverless))
                      }catch(e){
                        hasErrors = true;
                        sendCatch(e)
                        checkFulfill()
                      }
                    }
                    request.then(checkFulfill).catch(error => {
                        hasErrors = true;
                        sendCatch(error)
                    });
                } else {
                    //.before() was an object so meger into req,res obejcts
                    try{
                      if(typeof before == "object" && (typeof before.req == "object" || typeof before.res == "object")){
                          combine(before.req, before.res, _Serverless);
                      }
                      else if(typeof before == "object"){
                          combine(before, {}, _Serverless);
                      }
                    }catch(e){
                      hasErrors = true;
                      sendCatch(e)
                    }
                    checkFulfill();
                }
            };
            //start the loop
            next();
        } else {
            try {
                //no .befores or plugins
                var cb = runCallback(req, res, _Serverless);
                if(_finally){
                  try{
                    _finally(cb)
                  }catch(e){
                      console.log({message:e.message, stack:e.stack})
                  }
                }
            }catch(e){
               sendCatch(e)
            }
        }
    };

    this.cors = (url, preflightArray) =>{
        if(typeof url == "boolean" && url){
            _corsUrl = "*"
        }
        else{
            _corsUrl = url
        }
        if(preflightArray){
            _preflight = preflightArray.join(", ").toUpperCase()
        }
        return this;
    }

    this.filterPlugins = pluginFilter =>{
        pluginArray = pluginFilter;
        return this
    }

    this.excludePlugins = excludePluginArray =>{
        excludePluginArray.map(plugin=>{
          delete _defaultPlugins[plugin]
        })
        return this;
    }
    var _getPluginFunction = (cb)=>{

      if(typeof cb == "string" && _defaultPlugins[cb]){
            return _defaultPlugins[cb]
      }
      return cb;
    }
    //push a callback for the ResRes
    this.plugins = callbacks => {
        _useDefaultPlugins = false
        // _befores = _befores.concat(callbacks);
        // return this
        callbacks.map(cbs=>{
            if(Array.isArray(cbs)){
              var allCb = []
              cbs.map(cb=>{
                allCb.push(_getPluginFunction(cb))
              })
              _befores.push(_getPluginFunction(allCb))
            }else{
              _befores.push(_getPluginFunction(cbs))
            }
        })
        return this;
    };

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
    //if user sets finally
    this.finally = callback => {
        _finally = callback;
        return this;
    };
    //get/set serverless event object
    this.event = event => {
        if (typeof event == "object") _event = Object.assign(_event, event);
        return _event;
    };

    this.debug = ()=> {
        _debugMode = true
        return this;
    };
    //get/set serverless context
    this.context = context => {
        if (typeof context == "object") _context = Object.assign(_context, context);
        return _context;
    };
    return this;
};


module.exports = function(config_pluginName_reqRes, pluginReqRes){
  //if object as first param was passed it was a config obj
  let validateConfig= () => {
    if(!this.config){
      this.config = {}
    }
    if(!this.config.plugins){
      this.config.plugins = {}
    }
  }

  if(typeof config_pluginName_reqRes == "object"){
    this.config = config_pluginName_reqRes
  }
  //if second param was a function/array then its a plugin
  else if(typeof pluginReqRes == 'function' || Array.isArray(pluginReqRes)){
    validateConfig()
    this.config.plugins[config_pluginName_reqRes] = pluginReqRes
  }
  //return the main reqRes class
  else{
    validateConfig()
    return new  ReqResHandler(this.config, config_pluginName_reqRes)
  }
}

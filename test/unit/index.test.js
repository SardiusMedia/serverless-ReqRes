let assert = require( 'chai' ).assert;
let ReqRes = require( "./../../src/indexNew.js" )

let fakeRequest = (cb)=>{
  return new Promise((fulfill, reject)=>{
    var result;
    cb({
      queryStringParameters:{query:true},
      pathParameters:{path:true},
      headers:{
        header:true
      },
      body:'{"body":true}'
    },{},(err, cbObj)=>{
      if(err){
        reject(err)
      }
      try{
        cbObj.body = JSON.parse(cbObj.body)
      }catch(e){}
      result = cbObj
      fulfill(result)
    })
  })

}

describe('Basic Functionality', function(){
  describe('JSON Request', function() {

    var reqRes = ReqRes((req, res)=>{
      res.json(200, {works:true})
    })


    it('Should Return Json', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body.works, true);
    });

    it('Should Return 200', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 200);
    });

    it('Should Return content type application/json', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"application/json");
    });
  })

  describe('Send HTML Request', function() {

    var reqRes = ReqRes((req, res)=>{
      res.send("works")
      res.headers("Content-Type","text/html")
    })


    it('Should Return String', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "works");
    });

    it('Should Return 200', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 200);
    });

    it('Should Return content type text/html', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"text/html");
    });
  })

  describe('Send end() Request', function() {
   var ran = false
    var reqRes = ReqRes((req, res)=>{
      ran=true;
    }).before((req,res)=>{
      res.end()
    })

    it('Main function should not run', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(ran,false);
    });
    it('Should Return String', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "");
    });

    it('Should Return 200', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 200);
    });

    it('Should Return content type text/html', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"text/plain");
    });

  })


  describe('Run Finally() Request', function() {
    var result = false;
    var reqRes = ReqRes((req, res)=>{
      res.json({works:true})
      return "works"
    }).finally((rtn)=>{
      result = rtn;
    })

    it('Should run finally() and pass return value from main function', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(result, "works");
    });
  })

  describe('Run Finally() Request with before()/pugin', function() {
    var result = false;
    var reqRes = ReqRes((req, res)=>{
      res.json({works:true})
      return "works"
    })
    .before((req,res)=>{
      req.test=true
    })
    .finally((rtn)=>{
      result = rtn;
    })


    it('Should run finally() and pass return value from main function', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(result, "works");
    });
  })

  describe('throw Request', function() {

    var reqRes = ReqRes((req, res)=>{
      try{
        undefinedVar = undefinedVar2
      }catch(e){
        res.error(e)
      }
    })


    it('Should Return Error Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.isString(request.body.message);
    });

    it('Should Return 400', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 400);
    });

    it('Should Return content type application/json', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"application/json");
    });
  })

  describe('Check Req Res Objects', function() {
    var req = false
    var res = false;
    var lambda = false
    before((done) => {

      var reqRes = ReqRes((_req, _res, _lambda)=>{
        req = _req
        res = _res
        lambda = _lambda
        done()
      })
      fakeRequest(reqRes.run)

    });




    it('Has Req Headers', async () => {
       assert.equal(req.headers.header,true);
    });
    it('Has Req Query Params', async () => {
       assert.equal(req.query.query,true);
    });
    it('Has Req Path Params', async () => {
       assert.equal(req.path.path,true);
    });
    it('Has Req Params Params', async () => {
       assert.equal(req.params.path,true);
    });
    it('Req Has JSON body', async () => {
       assert.equal(req.body.body,true);
    });

    it('Res get/Set headers', async () => {
      res.headers("test",true)
       assert.equal(res.headers().test,true);
    });

    it('Res Reset get/Set headers', async () => {
      res.headers({"test2":true})
       assert.equal(res.headers().test2,true);
    });

    it('Res has .json()', async () => {
       assert.equal(typeof res.json,"function");
    });
    it('Res has .send()', async () => {
       assert.equal(typeof res.send,"function");
    });
    it('Res has .error()', async () => {
       assert.equal(typeof res.error,"function");
    });
    it('Res has .redirect()', async () => {
       assert.equal(typeof res.redirect,"function");
    });
    it('Res has .debug()', async () => {
       assert.equal(typeof res.debug,"function");
    });

    it('Has RAW event', async () => {
       assert.equal(typeof lambda.event,"object");
    });

    it('Has RAW context', async () => {
       assert.equal(typeof lambda.context,"object");
    });

    it('Has RAW callback', async () => {
       assert.equal(typeof lambda.callback,"function");
    });


  })

  describe('Check Req Res Objects (w/ plugins)', function() {
    var req = false
    var res = false;
    var lambda = false
    before((done) => {

      var reqRes = ReqRes((_req, _res, _lambda)=>{
        req = _req
        res = _res
        lambda = _lambda
        done()
      }).before(()=>{})
      fakeRequest(reqRes.run)

    });




    it('Has Req Headers', async () => {
       assert.equal(req.headers.header,true);
    });
    it('Has Req Query Params', async () => {
       assert.equal(req.query.query,true);
    });
    it('Has Req Path Params', async () => {
       assert.equal(req.path.path,true);
    });
    it('Has Req Params Params', async () => {
       assert.equal(req.params.path,true);
    });
    it('Req Has JSON body', async () => {
       assert.equal(req.body.body,true);
    });

    it('Res get/Set headers', async () => {
      res.headers("test",true)
       assert.equal(res.headers().test,true);
    });

    it('Res Reset get/Set headers', async () => {
      res.headers({"test2":true})
       assert.equal(res.headers().test2,true);
    });

    it('Res has .json()', async () => {
       assert.equal(typeof res.json,"function");
    });
    it('Res has .send()', async () => {
       assert.equal(typeof res.send,"function");
    });
    it('Res has .error()', async () => {
       assert.equal(typeof res.error,"function");
    });
    it('Res has .redirect()', async () => {
       assert.equal(typeof res.redirect,"function");
    });
    it('Res has .debug()', async () => {
       assert.equal(typeof res.debug,"function");
    });

    it('Has RAW event', async () => {
       assert.equal(typeof lambda.event,"object");
    });

    it('Has RAW context', async () => {
       assert.equal(typeof lambda.context,"object");
    });

    it('Has RAW callback', async () => {
       assert.equal(typeof lambda.callback,"function");
    });
  })

})

describe('Basic Error handlers', function(){
  describe('Sytax Error', function() {
    var catchedCalled = false;

    var reqRes = ReqRes((req, res)=>{
      undefinedVar = undefinedVar2
    })

    it('Should Return Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body.message, "undefinedVar2 is not defined");
    });
    it('Should Return Stack', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.isString(request.body.stack);
    });

    it('Should Return 400', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 400);
    });

    it('Should Return content type text/plain', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"application/json");
    });
  })

  describe('Catch Error', function() {
    var catchedCalled = false;

    var reqRes = ReqRes((req, res)=>{
      throw("AN ERROR")
    })
    .catch((e, req, res)=>{
      res.send(400, e)
    })



    it('Should Return Text', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "AN ERROR");

    });

    it('Should Return 400', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 400);
    });

    it('Should Return content type text/plain', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"text/plain");
    });
  })
})

describe('Befores', function(){
  describe('single', function() {
    var reqRes = ReqRes((req, res)=>{
      res.send([req.m1,res.m1, req.m2,res.m2].join(""))
    })
    .before((req,res)=>{
      req.m1 = "req1"
      res.m1 = "res1"
    })

    it('Should Return Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "req1res1");
    });
  });

  describe('Syncronus', function() {
    var reqRes = ReqRes((req, res)=>{
      res.send([req.m1,res.m1, req.m2,res.m2].join(""))
    })
    .before((req,res)=>{
      req.m1 = "req1"
      res.m1 = "res1"
    })
    .before({
      req:{
        m2:"req2"
      },
      res:{
        m2:"res2"
      }
    })

    it('Should Return Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "req1res1req2res2");
    });
  })

  describe('Asyncronus', function() {
    var reqRes = ReqRes((req, res,rawServerlessEvent)=>{
      req.stack.push("Finally")
      res.send(req.stack.join(","));
    })
    .before({stack:[]}) //same as above
    .before((req,res,rawServerlessEvent)=>{
      return new Promise((fulfill,reject)=>{
        setTimeout(()=>{
          req.stack.push("First")
          fulfill()
        },100)
      })
    })
    .before((req,res,lambda)=>{
      req.stack.push("Second")
    })
    .catch((errors, req,res, lambda)=>{
      res.error(errors)
    })

    it('Should Return Correct Stack Array', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "First,Second,Finally");
    });
  })


  describe('Syntax Error', function() {
    var reqRes = ReqRes((req, res)=>{
      res.send(req.message+req.message2)
    })
    .before((req,res)=>{
      undefinedVar = undefinedVar2
    })
    .before((req,res)=>{
      req.message2 = "2"
    })

    it('Should Return Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body.message, "undefinedVar2 is not defined");
    });
    it('Should Return Stack', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.isString(request.body.stack);
    });

    it('Should Return 400', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 400);
    });

    it('Should Return content type text/plain', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"application/json");
    });
  })

  describe('Catch Error', function() {
    var contiued = "";

    var reqRes = ReqRes((req, res)=>{
      contiued += " main"
    })
    .before((req,res)=>{
      throw("AN ERROR")
    })
    .before((req,res)=>{
      contiued += "before "
    })
    .catch((e, req, res)=>{
      res.send(400, e)
    })



    it('Should Return Text', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "AN ERROR");

    });

    it('Should Return 400', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.statusCode, 400);
    });

    it('Should Return content type text/plain', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(request.headers['Content-Type'],"text/plain");
    });

    it('Should of stopped all befores and main function', async () => {
      var request = await fakeRequest(reqRes.run)
       assert.equal(contiued,"");
    });
  })
})





describe('Plugins (Method Chained)', function(){
  describe('Single', function() {
      var reqRes = ReqRes((req, res)=>{
        res.send([req.m1,res.m1, req.m2,res.m2].join(""))
      })
      .plugins(
        [
          (req,res)=>{
            req.m1 = "1"
          }
        ]
    )


    it('Should Return Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "1");
    });
  })
  describe('Syncronus', function() {
    var reqRes = ReqRes((req, res)=>{
      res.send([req.m1,res.m1, req.m2,res.m2].join(""))
    })
    .plugins(
      [
        (req,res)=>{
          req.m1 = "1"
        },
        (req,res)=>{
          req.m1 += "2"
        },
        (req,res)=>{
          req.m1 += "3"
        }
      ]
  )


    it('Should Return Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "123");
    });
  })


  describe('Asyncronus', function() {
    var reqRes = ReqRes((req, res,rawServerlessEvent)=>{
      req.stack.push("Finally")
      res.send(req.stack.join(","));
    })
    .before({stack:[]})
    .plugins([
      (req,res,rawServerlessEvent)=>{
        return new Promise((fulfill,reject)=>{
          setTimeout(()=>{
            req.stack.push("First")
            fulfill()
          },100)
        })
      },
      [
        (req,res,rawServerlessEvent)=>{
          return new Promise((fulfill,reject)=>{
            setTimeout(()=>{
              req.stack.push("Third")
              fulfill()
            },200)
          })
        },
        (req,res,rawServerlessEvent)=>{
          return new Promise((fulfill,reject)=>{
            setTimeout(()=>{
              req.stack.push("Second")
              fulfill()
            },100)
          })
        }
      ],
      (req,res,rawServerlessEvent)=>{
          req.stack.push("Fourth")
      }
    ])

    it('Should Return Correct Stack Array', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "First,Second,Third,Fourth,Finally");
    });
  })





})

describe('Plugins (Global)', function(){
  describe('Register Plugin', function () {
    ReqRes("test",(req,res)=>{
      req.global ='works'
    })
    var reqRes = ReqRes((req, res)=>{
      res.send(  req.global )
    })

    it('Should Return Correct Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "works");
    });

  })

  describe('Single Plugin Config', function () {
    ReqRes({
      plugins:{
        test :(req,res)=>{
          req.global ='works'
        }
      }
    })
    var reqRes = ReqRes((req, res)=>{
      res.send(  req.global )
    })

    it('Should Return Correct Message', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "works");
    });
  })

  describe('Async Plugins Config', function () {
    ReqRes({
    plugins:{
        one:(req,res,rawServerlessEvent)=>{
          req.stack = []
          return new Promise((fulfill,reject)=>{
            setTimeout(()=>{
              req.stack.push("First")
              fulfill()
            },100)
          })
        },
        two:[
          (req,res,rawServerlessEvent)=>{
            return new Promise((fulfill,reject)=>{
              setTimeout(()=>{
                req.stack.push("Third")
                fulfill()
              },200)
            })
          },
          (req,res,rawServerlessEvent)=>{
            return new Promise((fulfill,reject)=>{
              setTimeout(()=>{
                req.stack.push("Second")
                fulfill()
              },100)
            })
          }
        ],
        three:(req,res,rawServerlessEvent)=>{
            req.stack.push("Fourth")
        }
      }
    })
    var reqRes = ReqRes((req, res)=>{
      req.stack.push("Finally")
      res.send(  req.stack.join(',') )
    })

    it('Should Return Correct Stack Array', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "First,Second,Third,Fourth,Finally");
    });
  })

  describe('Async Filter Global Plugins by Includes', function () {
    var reqRes = ReqRes((req, res)=>{
      req.stack.push("Finally")
      res.send(  req.stack.join(',') )
    }).plugins(["one"]);

    it('Should Return Correct Stack Array', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "First,Finally");
    });
  })

  describe('Async Filter Global Plugins by Excludes ', function () {
    var reqRes = ReqRes((req, res)=>{
      req.stack.push("Finally")
      res.send(  req.stack.join(',') )
    }).excludePlugins(["two"]);

    it('Should Return Correct Stack Array', async () => {
      var request = await fakeRequest(reqRes.run)
      assert.equal(request.body, "First,Fourth,Finally");
    });
  })

  describe('Async Filter Global Plugins by Includes (After Exculdes ran)', function () {
    var reqRes = ReqRes((req, res)=>{
      req.stack.push("Finally")
      res.send(  req.stack.join(',') )
    }).plugins(["one","two"]);

    it('Should Return Correct Stack Array', async () => {
      var request = await fakeRequest(reqRes.run)
        assert.equal(request.body, "First,Second,Third,Finally")
    });
  })
})

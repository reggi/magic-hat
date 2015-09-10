var express = require('express')
var promiseRouter = require('express-promise-router')
var _ = require('lodash')
var assert = require('assert')
var request = require('supertest')

var main = {}

/* global it */

main.middleware = function (path, middleware, OuterRouter, InnerRouter) {
  var app = express()
  var router
  if (OuterRouter && InnerRouter) {
    router = OuterRouter()
    router.get(path, function (req, res, next) {
      var router = InnerRouter()
      router.use(middleware)
      return router(req, res, next)
    })
    app.use(router)
  } else if (OuterRouter) {
    router = OuterRouter()
    router.get(path, middleware)
    app.use(router)
  } else if (InnerRouter) {
    app.get(path, function (req, res, next) {
      var router = InnerRouter()
      router.use(middleware)
      return router(req, res, next)
    })
  } else {
    app.get(path, middleware)
  }
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.send(err.message)
  })
  return app
}

main.middlewareAll = function (path, middleware) {
  var expressRouter = express.router
  return {
    'ar': main.middleware(path, middleware), // express-app-route-middleware.js
    'ar-pr': main.middleware(path, middleware, false, promiseRouter), // express-app-route-middleware-promiserouter-route-middleware.js
    'ar-er': main.middleware(path, middleware, false, expressRouter), // express-app-route-middleware-expressrouter-route-middleware.js
    'pr-ar': main.middleware(path, middleware, promiseRouter, false), // express-app-route-promiserouter-route-middleware.js
    'er-ar': main.middleware(path, middleware, expressRouter, false), // express-app-route-expressrouter-route-middleware.js
    'pr-er': main.middleware(path, middleware, promiseRouter, expressRouter), // express-app-route-promiserouter-route-middleware-expressrouter-route-middleware.js
    'er-pr': main.middleware(path, middleware, expressRouter, promiseRouter), // express-app-route-expressrouter-route-middleware-promiserouter-route-middleware.js
    'pr-pr': main.middleware(path, middleware, promiseRouter, promiseRouter), // express-app-route-promiserouter-route-middleware-promiserouter-route-middleware.js
    'er-er': main.middleware(path, middleware, expressRouter, expressRouter) // express-app-route-expressrouter-route-middleware-expressrouter-route-middleware.js
  }
}

main.route = function (route) {
  var app = express()
  app.use(route)
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.send(err.message)
  })
  return app
}

main.json = function (app, path, testJson) {
  return request(app)
  .get(path)
  .set('Accept', 'application/json')
  .expect(200)
  .expect(function (res) {
    assert.deepEqual(res.body, testJson)
  })
}

main.send = function (app, path, str) {
  return request(app)
  .get(path)
  .set('Accept', 'text/html')
  .expect(200)
  .expect(function (res) {
    assert.equal(res.text, str)
  })
}

main.shouldSend = function (app, path, str) {
  var should = ['should send', JSON.stringify(str), 'at', JSON.stringify(path)].join(' ')
  it(should, function (done) {
    return request(app)
    .get(path)
    .set('Accept', 'text/html')
    .expect(function (res) {
      assert.equal(undefined, res.error.text)
      assert.equal(200, res.statusCode)
      if (str) assert.equal(res.text, str)
      return res
    })
    .end(function (err, res) {
      if (err) return done(err)
      return done()
    })
  })
}

main.assertRedirect = function (url) {
  return function (res) {
    if (url) assert.equal(res.header.location, url)
  }
}

main.redirect = function (app, path, url) {
  return request(app)
  .get(path)
  .expect(main.assertStatus(302))
  .expect(main.assertRedirect(url))
}

main.shouldRedirect = function (app, path, url) {
  var should = ['should redirect', JSON.stringify(url), 'at', JSON.stringify(path)].join(' ')
  it(should, function (done) {
    return request(app)
    .get(path)
    .expect(function (res) {
      var expectedCode = 302
      var result = res.statusCode + ' ' + JSON.stringify(res.text)
      var expected = expectedCode + ' ' + JSON.stringify(res.text)
      if (url) assert.equal(res.header.location, url)
      assert.equal(result, expected)
      return res
    })
    .end(function (err, res) {
      if (err) return done(err)
      return done()
    })
  })
}

main.notFound = function (app, path, str) {
  return request(app)
  .get(path)
  .expect(404)
}

main.shouldNotFound = function (app, path, str) {
  var should = ['should not found', 'at', JSON.stringify(path)].join(' ')
  it(should, function (done) {
    return request(app)
    .get(path)
    .expect(function (res) {
      var expectedCode = 404
      var expected
      var result = res.statusCode + ' ' + JSON.stringify(res.text)
      if (str) {
        expected = expectedCode + ' ' + JSON.stringify(str)
      } else {
        expected = expectedCode + ' ' + JSON.stringify(res.text)
      }
      assert.equal(result, expected)
      return res
    })
    .end(function (err, res) {
      if (err) return done(err)
      return done()
    })
  })
}

main.assertStatus = function (statusCode, text) {
  return function (res) {
    var result = (text) ? [res.statusCode, JSON.stringify(res.text)].join(' ') : [res.statusCode].join(' ')
    var expected = (text) ? [statusCode, JSON.stringify(text)].join(' ') : [statusCode].join(' ')
    assert.equal(result, expected, 'Error ' + res.text)
  }
}

main.throw = function (app, path, text) {
  return request(app)
  .get(path)
  .expect(main.assertStatus(500, text))
}

main.shouldThrow = function (app, path, str) {
  var should = ['should throw error', JSON.stringify(str), 'at', JSON.stringify(path)].join(' ')
  it(should, function (done) {
    return request(app)
    .get(path)
    .expect(function (res) {
      var expectedCode = 500
      var result, expected
      if (str) {
        result = res.statusCode + ' ' + JSON.stringify(res.text)
        expected = expectedCode + ' ' + JSON.stringify(str)
      } else {
        result = res.statusCode
        expected = expectedCode
      }
      assert.equal(result, expected)
      return res
    })
    .end(function (err, res) {
      if (err) return done(err)
      return done()
    })
  })
}

main.loop = function (testFn, apps, shouldStr, args) {
  _.each(apps, function (app, name) {
    var should = [shouldStr, name].join(' ')
    it(should, function () {
      var _args = _.clone(args)
      _args.unshift(app)
      return testFn.apply(null, _args)
    })
  })
}

module.exports = main

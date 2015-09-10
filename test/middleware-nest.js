var assert = require('assert')
var _ = require('lodash')
var request = require('supertest')
var expressTest = require('../lib/express-test')
var middlewareNest = require('../lib/middleware-nest')
var promiseRouter = require('express-promise-router')
var express = require('express')
var expressRouter = express.Router
var middlwareNextPromise = middlewareNest.applyRouter(promiseRouter)
/* global describe, it */
describe('middleware-nest', function () {
  describe('respond with json', function () {
    var errMessage = 'Hi'
    var success = {
      'nest-er': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, false, function (req, res, next) {
          return res.json({'name': 'tobi'})
        })
      }),
      'nest-pr': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, promiseRouter, function (req, res, next) {
          return res.json({'name': 'tobi'})
        })
      }),
      'nest-er promise': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, false, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            return res.json(data)
          })
        })
      }),
      'nest-pr promise': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, promiseRouter, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            return res.json(data)
          })
        })
      }),
      'nest-pr promise (applied)': expressTest.middlewareAll('/', function (req, res, next) {
        return middlwareNextPromise(req, res, next, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            return res.json(data)
          })
        })
      })
    }
    var error = {
      'nest-er next': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, expressRouter, function (req, res, next) {
          return next(new Error(errMessage))
        })
      }),
      'nest-pr next': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, promiseRouter, function (req, res, next) {
          return next(new Error(errMessage))
        })
      }),
      'nest-er promise next': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, expressRouter, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            return next(new Error(errMessage))
          })
        })
      }),
      'nest-pr promise next': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, promiseRouter, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            return next(new Error(errMessage))
          })
        })
      }),
      'nest-er throw': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, expressRouter, function (req, res, next) {
          throw new Error(errMessage)
        })
      }),
      'nest-pr throw': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, promiseRouter, function (req, res, next) {
          throw new Error(errMessage)
        })
      }),
      'nest-er promise throw': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, expressRouter, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            throw new Error(errMessage)
          })
          .catch(next)
        })
      }),
      'nest-pr promise throw': expressTest.middlewareAll('/', function (req, res, next) {
        return middlewareNest(req, res, next, promiseRouter, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            throw new Error(errMessage)
          })
        })
      }),
      'nest-pr promise throw (applied)': expressTest.middlewareAll('/', function (req, res, next) {
        return middlwareNextPromise(req, res, next, function (req, res, next) {
          return Promise.resolve({'name': 'tobi'})
          .then(function (data) {
            throw new Error(errMessage)
          })
        })
      })
    }
    _.each(success, function (apps, outerName) {
      _.each(apps, function (app, innerName) {
        var should = 'should work when in config ' + outerName + ' ' + innerName
        it(should, function (done) {
          request(app)
          .get('/')
          .set('Accept', 'application/json')
          .expect(200)
          .expect(function (res) {
            assert.equal(res.body.name, 'tobi')
          })
          .end(function (err, res) {
            if (err) return done(err)
            done()
          })
        })
      })
    })
    _.each(error, function (apps, outerName) {
      _.each(apps, function (app, innerName) {
        var should = 'should return error when in config ' + outerName + ' ' + innerName
        it(should, function (done) {
          request(app)
          .get('/')
          .expect(500, errMessage, done)
        })
      })
    })
  })
})

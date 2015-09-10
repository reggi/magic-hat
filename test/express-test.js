var assert = require('assert')
var _ = require('lodash')
var expressTest = require('../lib/express-test')
var request = require('supertest')
/* global describe, it */
describe('express-range', function () {
  describe('respond with json', function () {
    var apps = expressTest.middlewareAll('/', function (req, res, next) {
      return res.json({'name': 'tobi'})
    })
    _.each(apps, function (app, name) {
      var should = 'should work when in config ' + name
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
})

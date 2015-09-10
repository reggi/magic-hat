var magicHat = require('../lib/magic-hat')
var expressTest = require('../lib/express-test')
var assert = require('assert')
var httpMocks = require('node-mocks-http')
var stdout = require('test-console').stdout
var middlewareNest = require('../lib/middleware-nest').applyRouter()
var Promise = require('bluebird')
var Req = magicHat.Req
/* global describe, it */
describe('magic-hat', function () {
  describe('.json()', function () {
    var apps = expressTest.middlewareAll('/', magicHat.json({'name': 'tobi'}))
    expressTest.loop(expressTest.json, apps, 'should serve json', ['/', {'name': 'tobi'}])
  })
  describe('.send()', function () {
    var apps = expressTest.middlewareAll('/', magicHat.send('hello world'))
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'hello world'])
  })
  describe('.redirect()', function () {
    var apps = expressTest.middlewareAll('/', magicHat.redirect('hello world'))
    expressTest.loop(expressTest.redirect, apps, 'should redirect', ['/', 'hello world'])
  })
  describe('.throw()', function () {
    var apps
    apps = expressTest.middlewareAll('/', magicHat.throw('dalek alert'))
    expressTest.loop(expressTest.throw, apps, 'should report string error', ['/', 'dalek alert'])
    apps = expressTest.middlewareAll('/', magicHat.throw(new Error('dalek alert')))
    expressTest.loop(expressTest.throw, apps, 'should report error object', ['/', 'dalek alert'])
  })
  describe('.log()', function () {
    it('should log string from within middleware', function () {
      var output = stdout.inspectSync(function () {
        var req = httpMocks.createRequest({url: '/'})
        var res = httpMocks.createResponse()
        var next = function () {}
        return middlewareNest(req, res, next, [
          magicHat.log('Small World.')
        ])
      })
      assert.deepEqual(output, ['Small World.\n'])
    })
  })
  describe('.set() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.set(Req('value'), 'hello world'),
      magicHat.send(Req('value'))
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'hello world'])
    apps = expressTest.middlewareAll('/', [
      magicHat.set('value', 'hello panckae'),
      magicHat.send(Req('value'))
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'hello panckae'])
  })
  describe('.set() / .set() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.set(Req('alpha'), 'Alpha'),
      magicHat.set(Req('beta'), Req('alpha')),
      magicHat.send(Req('beta'))
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string from req', ['/', 'Alpha'])
    apps = expressTest.middlewareAll('/', [
      magicHat.set(Req('alpha'), 'Alpha'),
      magicHat.set('beta', Req('alpha')),
      magicHat.send(Req('beta'))
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string from req', ['/', 'Alpha'])
  })
  describe('.set / .json()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.set(Req('greetings'), {'dalek': 'Exterminate!'}),
      magicHat.json(Req('greetings'))
    ])
    expressTest.loop(expressTest.json, apps, 'should serve json from req', ['/', {'dalek': 'Exterminate!'}])
  })
  describe('.nextRoute()', function () {
    var apps
    apps = expressTest.middlewareAll('/', magicHat.nextRoute())
    expressTest.loop(expressTest.notFound, apps, 'should not serve when next route', ['/'])
  })
  describe('.next()', function () {
    var apps
    apps = expressTest.middlewareAll('/', magicHat.next('route'))
    expressTest.loop(expressTest.notFound, apps, 'should not serve when next route', ['/'])
    apps = expressTest.middlewareAll('/', magicHat.next(new Error('boom')))
    expressTest.loop(expressTest.throw, apps, 'should serve error', ['/', 'boom'])
  })
  describe('.nest()', function () {
    var apps = expressTest.middlewareAll('/', magicHat.nest([
      magicHat.send('hello world')
    ]))
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'hello world'])
  })
  describe('Req()', function () {
    var val
    val = Req('hello')
    assert.equal(val.reference, 'hello')
    val = Req(Req('hello'))
    assert.equal(val.reference, 'hello')
  })
  describe('magicHat()', function () {
    var apps
    apps = expressTest.middlewareAll('/', magicHat().send('hello world').assemble())
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'hello world'])
    var mw = magicHat()
      .set('daft', 'punk')
      .send(Req('daft'))
      .assemble()
    apps = expressTest.middlewareAll('/', mw)
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'punk'])
  })
  describe('.exe() / .send()', function () {
    var async = function (value) {
      return Promise.resolve(value).delay(10)
    }
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.exe('value', async, 'alpha pancake'),
      magicHat.send(Req('value'))
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'alpha pancake'])
    apps = expressTest.middlewareAll('/', [
      magicHat.exe(Req('value'), async, 'beta pancake'),
      magicHat.send(Req('value'))
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'beta pancake'])
  })
  describe('.exe() / .send() / .assemble()', function () {
    var sync = function (value) {
      return value
    }
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat()
      .exe('value', sync, 'delta pancake')
      .send(Req('value'))
      .assemble()
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'delta pancake'])
    apps = expressTest.middlewareAll('/', [
      magicHat()
      .set('gamma', 'gamma pancake')
      .exe('value', sync, Req('gamma'))
      .send(Req('value'))
      .assemble()
    ])
    expressTest.loop(expressTest.send, apps, 'should serve string', ['/', 'gamma pancake'])
  })
  describe('.ifExe() / .send()', function () {
    var apps
    var returnsTrue = function () {
      return true
    }
    var returnsFalse = function () {
      return false
    }
    var returnsValue = function (value) {
      return value
    }
    apps = expressTest.middlewareAll('/', [
      magicHat.ifExe(returnsTrue, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifExe(returnsFalse, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifExe(returnsValue, true, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifExe(returnsValue, false, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.set() / .ifExe() / .send()', function () {
    var apps
    var returnsValue = function (value) {
      return value
    }
    apps = expressTest.middlewareAll('/', [
      magicHat.set('value', true),
      magicHat.ifExe(returnsValue, Req('value'), [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.set(Req('value'), false),
      magicHat.ifExe(returnsValue, Req('value'), [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.if()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.if(true, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.if([], true, 'hi', [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.if(false, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.if([], false, true, 'hi', [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.ifNot()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNot(null, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNot([].length, false, undefined, null, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNot(true, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNot([], false, true, 'hi', [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.ifEqual() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.ifEqual(null, null, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifEqual(true, true, true, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifEqual('happy', 'happy', 'happy', [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifEqual(true, false, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifEqual(true, 'not same', true, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifEqual('happy', false, 'happy', [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.ifNotEqual() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNotEqual(null, undefined, [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNotEqual(true, false, 'valid', [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNotEqual('happy', 'joy', 'joy', [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNotEqual(true, true, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNotEqual(true, true, true, [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNotEqual(true, true, 'ice cream', [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.ifNotEqual('happy', 'happy', 'happy', [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.set() / .ifInstanceOf() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifInstanceOf(Error, Req('err'), [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifInstanceOf(String, Req('err'), [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.set() / .ifNotInstanceOf() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifNotInstanceOf(String, Req('err'), [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifNotInstanceOf(Error, Req('err'), [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.set() / .ifTypeOf() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifTypeOf('object', Req('err'), [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifTypeOf('string', Req('err'), [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.set() / .ifNotTypeOf() / .send()', function () {
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifNotTypeOf('string', Req('err'), [
        magicHat.send('good')
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
    apps = expressTest.middlewareAll('/', [
      magicHat.set('err', new Error('the error message')),
      magicHat.ifNotTypeOf('object', Req('err'), [
        magicHat.send('bad')
      ]),
      magicHat.send('good')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'good'])
  })
  describe('.exe() / .exe() / .send()', function () {
    var Field = function (option) {
      this.option = option
    }
    Field.prototype.request = function (thing) {
      return Promise.resolve(this.option + ' request ' + thing).delay(10)
    }
    var fieldInstance = function (option) {
      return new Field(option)
    }
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.exe('myField', fieldInstance, 'alpha'),
      magicHat.exe('value', Req.bind('myField.request', 'myField'), 'beta'),
      magicHat.send(Req('value'))
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'alpha request beta'])
  })
  describe('.exe() / .send()', function () {
    var fnThrow = function (error) {
      throw error
    }
    var fnReturn = function (value) {
      return value
    }
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.exe(fnThrow, new Error('hello world'))
    ])
    expressTest.loop(expressTest.throw, apps, 'should send if true from req', ['/', 'hello world'])
    apps = expressTest.middlewareAll('/', [
      magicHat.exe(fnReturn, 'Hi'),
      magicHat.send('hello world')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'hello world'])
  })
  describe('.exeCatch() / .ifInstanceOf()', function () {
    var fnThrow = function (error) {
      throw error
    }
    var fnReturn = function (value) {
      return value
    }
    var apps
    apps = expressTest.middlewareAll('/', [
      magicHat.exeCatch('hello', fnThrow, new Error('meow')),
      magicHat.ifInstanceOf(Error, Req('hello'), [
        magicHat.send(Req('hello.message'))
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'meow'])
    apps = expressTest.middlewareAll('/', [
      magicHat.exeCatch('hello', fnReturn, 'rawr'),
      magicHat.ifNotInstanceOf(Error, Req('hello'), [
        magicHat.send(Req('hello'))
      ]),
      magicHat.send('bad')
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'rawr'])
  })
  describe('.push()', function () {
    var apps = expressTest.middlewareAll('/',
      magicHat()
      .push(function (req, res, next) {
        return res.send('rawr')
      })
      .assemble()
    )
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'rawr'])
  })
  describe('.send() (scope outside)', function () {
    var hello = 'soup'
    var apps = expressTest.middlewareAll('/', [
      magicHat.send(hello)
    ])
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'soup'])
  })
  describe('.send() (scope outside)', function () {
    function sendMaker (value) {
      return magicHat()
        .send(value)
        .assemble()
    }
    var apps
    apps = expressTest.middlewareAll('/', sendMaker('soup'))
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'soup'])
    apps = expressTest.middlewareAll('/', sendMaker('salad'))
    expressTest.loop(expressTest.send, apps, 'should send if true from req', ['/', 'salad'])
  })
})

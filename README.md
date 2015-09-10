# Magic Hat

I've always wanted an easier way of writing express middleware.

Take the standard `hello world` example.

```js
app.get('/', function (req, res, next) {
  return res.send('hello world')
})
```

With Magic Hat this becomes:

```js
app.get('/', magicHat.send('hello world'))
```

## The Req variable

The thing that makes middleware pretty hard to work with is that it's all asynchronous, which makes managing control flow difficult. The `req` variable is used in many pieces of middleware to store custom data as well as information about the current request.

This example serves the value of `?user=reggi`, we know it's stored in `req.query.user`.

```js
app.get('/', function (req, res, next) {
  return res.send(req.query.user)
})
```

How can we do something like this with Magic Hat? Surely we can't do this, because we don't have access to `req`.

```js
// this will not work
app.get('/', magicHat.send(req.query.user))
```

I created a `Req` object that accesses the scoped property of `req` from outside the callback. To use it do something like this:

```js
app.get('/', magicHat.send(Req('query.user')))
```

Perhaps you can start to see the power of this, or not. Magic Hat is loaded with other features that attempt at allowing you to write smaller functions which you can surround with control flow goodness.

## Conditionals

One major use case for Magic Hat is conditionals. Take the case where we'd like to serve a string specifically if the user query is `github`.

```js
app.get('/', magicHat()
  .ifEqual(Req('query.user'), 'github', magicHat.send('BOO'))
  .send(Req('query.user'))
  .assemble()
)
```

Or serve an error:

```js
app.get('/', magicHat()
  .ifEqual(Req('query.user'), 'github', magicHat.next(new Error('invalid user')))
  .send(Req('query.user'))
  .assemble())
)
```

## Writing Real Functions

With Magic Hat you can write normal functions and pass them around with Magic Hat using `.exe()`. This way you can strip the real functionality out of your middleware flow.

```js
function greet (user) {
  return "Hello " + user + "!"
}
app.get('/', magicHat()
  .if(Req('query.user'), magicHat())
    .exe('greetUser', greet, Req('query.user'))
    .send(Req('greetUser'))
    .assemble())
  .send('Hi Person!')
  .assemble())
)
```

## Chain Middleware

Because express middleware can be passed as an array of middleware or just one function Magic Hat works the same way.

Each piece as argument.

```js
app.get('/', magicHat.set('example', 'hi'), magicHat.send(Req('example')))
```

Pass in as array.

```js
app.get('/', [
  magicHat.set('example', 'hi'),
  magicHat.send(Req('example')),
])
```

Or chain each call together and call `.assemble()` at the end.

```js
app.get('/', magicHat()
  .set('example', 'hi')
  .send(Req('example'))
  .assemble()
)
```

## api

```js
magicHat.Req
// conditionals
magicHat.if
magicHat.ifNot
magicHat.ifEqual
magicHat.ifNotEqual
magicHat.ifInstanceOf
magicHat.ifNotInstanceOf
magicHat.ifTypeOf
magicHat.ifNotTypeOf
// basic response
magicHat.render
magicHat.redirect
magicHat.send
magicHat.json
// handeling
magicHat.throw
magicHat.next
magicHat.nextRoute
// nesting middleware
magicHat.nest
magicHat.nestParam
// root conditional
magicHat.ifExe
// modifiers
magicHat.set
magicHat.exe
magicHat.exeCatch
// debugging
magicHat.log
```

## Example

```js
var util = require('./util')
var model = require('./model')
var express = require('express')
var Promise = require('bluebird')
var fs = Promise.promisifyAll(require('fs'))
var csv = Promise.promisifyAll(require('csv'))
var _ = require('lodash')
var magicHat = require('./magic-hat')
var Req = magicHat.Req
var multipartMiddleware = require('connect-multiparty')

function main () {
  var router = express.Router()
  router.use(multipartMiddleware())
  router.param('redirectsCsv', main.redirectsCsv())
  router.param('shopifyRedirects', main.shopifyRedirects())
  router.all('/api/redirects-csv/:redirectsCsv.json', magicHat.json(Req('redirectsCsv')))
  router.all('/api/shopify-redirects/:shopifyRedirects.json', magicHat.json(Req('shopifyRedirects')))
  router.all('/api/redirects-csv/:redirectsCsv/shopify-redirects/:shopifyRedirects/report.json', main.report())
  router.all('/api/shopify-redirects/:shopifyRedirects/redirects-csv/:redirectsCsv/report.json', main.report())
  return router
}

main.redirectsCsv = function () {
  return magicHat.nestParam(magicHat()
    .set('fileType', 'uploadedRedirectsCsv')
    .ifEqual(Req('params.redirectsCsv'), 'upload', magicHat()
      .ifNotEqual(Req('method'), 'POST', magicHat.next(new Error('method must be POST')))
      .ifNot(Req('files'), magicHat.next(new Error('files missing')))
      .exe('files', _.values, Req('files'))
      .ifNot(Req('files.0'), magicHat.next(new Error('no files')))
      .if(Req('files.1'), magicHat.next(new Error('only one file at a time')))
      .set('file.path', Req('files.0.path'))
      .set('file.name', Req('files.0.name'))
      .exe('file.content', fs.readFileAsync, Req('file.path'), 'utf8')
      .exe('file.content', csv.parseAsync, Req('file.content'), {'columns': true})
      .exe('file', model.storeContent, Req('db'), Req('shopify.user.shop'), Req('fileType'), Req('file.content'), Req('file.name'))
      .set('session.uploadedRedirectsCsvHash', Req('file.hash'))
      .set('redirectsCsv', Req('file'))
      .set('files', null)
      .set('file', null)
      .next('route')
      .assemble())
    .set(Req('lookupHash'), Req('params.redirectsCsv'))
    .ifEqual(Req('params.redirectsCsv'), 'session', magicHat()
      .ifNot(Req('session.uploadedRedirectsCsvHash'), magicHat.next(new Error('no csv was uploaded this session')))
      .set('lookupHash', Req('session.uploadedRedirectsCsvHash'))
      .assemble())
    .exe('redirectsCsv', model.findContent, Req('db'), Req('shopify.user.shop'), Req('fileType'), Req('lookupHash'))
    .ifNot(Req('redirectsCsv'), magicHat.next(new Error('redirects csv not found')))
    .assemble())
}

main.shopifyRedirects = function () {
  return magicHat.nestParam(magicHat()
    .set('fileType', 'requestedShopifyRedirects')
    .ifNot(Req('params.shopifyRedirects'), magicHat.next(new Error('shopifyRedirects param must be set')))
    .ifEqual(Req('params.shopifyRedirects'), 'request', magicHat()
      .exe('shopifyRedirects', Req.bind('shopify.api.requestAll', 'shopify.api'), 'redirects')
      .exe('shopifyRedirects', model.storeContent, Req('db'), Req('shopify.user.shop'), Req('fileType'), Req('shopifyRedirects'), Req('file.name'))
      .set('session.requestedShopifyRedirectsHash', Req('shopifyRedirects.hash'))
      .next('route')
      .assemble())
    .set('lookupHash', Req('params.shopifyRedirects'))
    .ifEqual(Req('params.shopifyRedirects'), 'session', magicHat()
      .ifNot(Req('session.requestedShopifyRedirectsHash'), magicHat.next(new Error('no redirects were requested this session')))
      .set('lookupHash', Req('session.requestedShopifyRedirectsHash'))
      .assemble())
    .exe('shopifyRedirects', model.findContent, Req('db'), Req('shopify.user.shop'), Req('fileType'), Req('lookupHash'))
    .ifNot(Req('shopifyRedirects'), magicHat.next(new Error('shopify redirects not found')))
    .assemble())
}

main.report = function () {
  return magicHat()
    .ifNot(Req('redirectsCsv'), magicHat.next(new Error('no redirects csv provided')))
    .ifNot(Req('shopifyRedirects'), magicHat.next(new Error('no shopify redirects provided')))
    .exe('report', util.redirectReport, Req('shopifyRedirects.data'), Req('redirectsCsv.data'))
    .ifEqual(Req('query.display'), 'natural', magicHat()
      .json(Req('report.natural'))
      .assemble())
    .ifEqual(Req('query.display'), 'table', magicHat()
      .json(Req('report.table'))
      .assemble())
    .json(Req('report'))
    .assemble()
}

module.exports = main
```

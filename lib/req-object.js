var _ = require('lodash')
var dotty = require('dotty')

function Req (str) {
  this.reference = str
  if (str instanceof Req) return str
  if (!(this instanceof Req)) return new Req(str)
  return this
}

Req.prototype.setBind = function (value) {
  this.bindTo = value
  return this
}

Req.bind = function (fn, bindTo) {
  var myReq = new Req(fn)
  myReq.setBind(bindTo)
  return myReq
}

/** resovles req value */
Req.resolve = function (req, val) {
  if (val instanceof Req) {
    var value = dotty.get(req, val.reference)
    if (!val.bindTo) return value
    var _this = dotty.get(req, val.bindTo)
    return _.bind(value, _this)
  } else {
    return val
  }
}

/** resovles arry of values req */
Req.resolveAll = function (req, arr) {
  return _.map(arr, function (val) {
    return Req.resolve(req, val)
  })
}

Req.getRef = function (val) {
  if (val instanceof Req) {
    return val.reference
  } else {
    return val
  }
}

module.exports = Req

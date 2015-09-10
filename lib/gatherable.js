var _ = require('lodash')

function main (obj, exit, name, fn) {
  exit = (exit) ? exit : 'value'
  var Gatherable = function () {
    if (!(this instanceof Gatherable)) return new Gatherable()
    this._gather = []
  }
  Gatherable = fn || Gatherable
  var rename = name || obj.name || false
  if (rename) changeName(Gatherable, rename)
  var methods = getMethods(Gatherable, obj)
  var prototypes = getPrototypes(Gatherable, obj)
  Gatherable.prototype = prototypes
  Gatherable.prototype[exit] = exitPrototype
  _.extend(Gatherable, methods)
  return Gatherable
}

var exitPrototype = main.getExitPrototype = function () {
  return this._gather
}

var getMethods = main.getMethods = function (Gatherable, fn) {
  var methods = _.functions(fn)
  return _.chain(methods)
  .map(function (method) {
    return [method, fn[method]]
  })
  .object()
  .value()
}

var getPrototypes = main.getPrototypes = function (Gatherable, fn) {
  var methods = _.functions(fn)
  return _.chain(methods)
  .map(function (method) {
    return [method, function () {
      var args = _.values(arguments)
      var executed = fn[method].apply(Gatherable, args)
      this._gather.push(executed)
      return this
    }]
  })
  .object()
  .value()
}

var changeName = main.changeName = function (fn, name) {
  Object.defineProperty(fn, 'name', {
    get: function () {
      return name
    }
  })
}

module.exports = main

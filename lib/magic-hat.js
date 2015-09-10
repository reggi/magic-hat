var Promise = require('bluebird')
var _ = require('lodash')
var dotty = require('dotty')
var promiseRouter = require('express-promise-router')
// var expressRouter = require('express').Router
var middlewareNest = require('./middleware-nest').applyRouter(promiseRouter)
var S = require('underscore.string')
var Req = require('./req-object')
var gatherable = require('./gatherable')

var main = {}

main._blacklist = ['_blacklist']

main.Req = Req

main._blacklist.push('Req')

/** Basic Middleware */

/* istanbul ignore next */
/** serve render response */
main._render = function (template, data) {
  return function (req, res, next) {
    return res.render(template, data)
  }
}

/** serve redirect response */
main._redirect = function (redirectStr) {
  return function (req, res, next) {
    return res.redirect(redirectStr)
  }
}

/** serve string response */
main._send = function (sendStr) {
  return function (req, res, next) {
    return res.send(sendStr)
  }
}

/** serve json response */
main._json = function (sendJson) {
  return function (req, res, next) {
    return res.json(sendJson)
  }
}

/** throw an error */
main._throw = function (error) {
  return function (req, res, next) {
    if (typeof error === 'string') return next(new Error(error))
    return next(error)
  }
}

/** log string */
main._log = function (logStr) {
  var args = _.values(arguments)
  return function (req, res, next) {
    _.each(args, function (arg) {
      console.log(arg)
    })
    return next()
  }
}

/** call the next */
main._next = function (value) {
  return function (req, res, next) {
    return next(value)
  }
}

/** call the next route */
main._nextRoute = function () {
  return function (req, res, next) {
    return next('route')
  }
}

/** nest middleware */
main._nest = function (main) {
  return function (req, res, next) {
    return middlewareNest(req, res, next, main)
  }
}

/** nest param middleware */
main._nestParam = function (main) {
  return function (req, res, next) {
    return middlewareNest(req, res, function (nextValue) {
      if (nextValue === 'route') return next()
      return next(nextValue)
    }, main)
  }
}

main._ifExe = function (fn, args, middleware) {
  args = _.values(arguments)
  var fnArgs = _.slice(args, 1, args.length - 1)
  middleware = _.last(args)
  return function (req, res, next) {
    return Promise
    .method(fn)
    .apply(null, fnArgs)
    .then(function (value) {
      if (value) return middlewareNest(req, res, next, middleware)
      return next()
    })
    .catch(next)
  }
}

main._basicMethods = _.difference(_.keys(main), main._blacklist)
main._blacklist.push('_basicMethods')
main._blacklist = main._blacklist.concat(main._basicMethods)

/** Modifier Middleware */

main._set = function (reference, value) {
  return function (req, res, next) {
    dotty.put(req, reference, value)
    return next()
  }
}

main._exe = function (_reference, _fn, _fnArgs) {
  var args = _.values(arguments)
  var fn = (typeof _reference === 'function') ? _reference : _fn
  var fnArgs = (typeof _reference === 'function') ? _.slice(args, 1) : _.slice(args, 2)
  var reference = (typeof _reference === 'function') ? undefined : _reference
  return function (req, res, next) {
    return Promise
    .method(fn)
    .apply(null, fnArgs)
    .then(function (value) {
      if (reference) dotty.put(req, reference, value)
      return next()
    })
    .catch(function (e) {
      return next(e)
    })
  }
}

main._exeCatch = function (reference, fn, _fnArgs) {
  var args = _.values(arguments)
  var fnArgs = _.slice(args, 2)
  return function (req, res, next) {
    return Promise
    .method(fn)
    .apply(null, fnArgs)
    .then(function (value) {
      dotty.put(req, reference, value)
      return next()
    })
    .catch(function (err) {
      dotty.put(req, reference, err)
      return next()
    })
  }
}

main._assignmentMethods = _.difference(_.keys(main), main._blacklist)
main._blacklist.push('_assignmentMethods')
main._blacklist = main._blacklist.concat(main._assignmentMethods)

main.fnSingleIf = function (value) {
  if (value) return true
  return false
}

main.fnSingleIfNot = function (value) {
  if (!value) return true
  return false
}

main.fnSingleIfEqual = function (condition, value) {
  if (value === condition) return true
  return false
}

main.fnSingleIfNotEqual = function (condition, value) {
  if (!(value === condition)) return true
  return false
}

main.fnSingleIfInstanceOf = function (condition, value) {
  if (value instanceof condition) return true
  return false
}

main.fnSingleIfNotInstanceOf = function (condition, value) {
  if (!(value instanceof condition)) return true
  return false
}

main.fnSingleIfTypeOf = function (condition, value) {
  if (typeof value === condition) return true
  return false
}

main.fnSingleIfNotTypeOf = function (condition, value) {
  if (!(typeof value === condition)) return true
  return false
}

main._fnSingleIfMethods = _.difference(_.keys(main), main._blacklist)
main._blacklist.push('_fnSingleIfMethods')
main._blacklist = main._blacklist.concat(main._fnSingleIfMethods)

main._fnMultiGenerator = function (_fnArgs, _fn) {
  var args = _.values(arguments)
  var fnArgs = _.initial(args)
  var fn = _.last(args)
  var values = (fn.length === 1) ? fnArgs : _.slice(fnArgs, 1)
  var condition = (fn.length === 1) ? undefined : _.first(args)
  var conditions = _.map(values, function (value) {
    if (fn.length === 2) return fn(condition, value)
    return fn(value)
  })
  var result = (!_.contains(conditions, false))
  return result
}

main._fnMultiBuild = function (methods) {
  return _.chain(methods)
  .map(function (method) {
    var name = method.replace('Single', 'Multi')
    return [name, function () {
      var args = _.values(arguments)
      args.push(main[method])
      return main._fnMultiGenerator.apply(null, args)
    }]
  })
  .object()
  .value()
}

main._conditionalMiddlwareBuild = function (methods) {
  return _.chain(methods)
  .map(function (method) {
    var name = '_' + S.decapitalize(method.replace('fnMulti', ''))
    return [name, function () {
      var args = _.values(arguments)
      return function (req, res, next) {
        args.unshift(main[method])
        return main.ifExe.apply(null, args)(req, res, next)
      }
    }]
  })
  .object()
  .value()
}

main._helperMethods = _.difference(_.keys(main), main._blacklist)
main._blacklist.push('_helperMethods')
main._blacklist = main._blacklist.concat(main._helperMethods)

main._fnMultiIf = main._fnMultiBuild(main._fnSingleIfMethods)
main._fnMultiIfMethods = _.keys(main._fnMultiIf)
main._blacklist.push('_fnMultiIf', '_fnMultiIfMethods')
_.extend(main, main._fnMultiIf)
main._blacklist = main._blacklist.concat(main._fnMultiIfMethods)

main._conditionalMiddleware = main._conditionalMiddlwareBuild(main._fnMultiIfMethods)
main._conditionalMethods = _.keys(main._conditionalMiddleware)
main._blacklist.push('_conditionalMiddleware', '_conditionalMethods')
_.extend(main, main._conditionalMiddleware)
main._blacklist = main._blacklist.concat(main._conditionalMethods)

main._resolve = function (methods) {
  return _.chain(methods)
  .map(function (method) {
    var name = method.replace(/^_/, '')
    return [name, function () {
      var args = _.values(arguments)
      return function (req, res, next) {
        var resolvedArgs = Req.resolveAll(req, args)
        return main[method].apply(null, resolvedArgs)(req, res, next)
      }
    }]
  })
  .object()
  .value()
}

main._exposeResolve = _.flatten([main._conditionalMethods, main._basicMethods])
main._resolved = main._resolve(main._exposeResolve)
main._resolvedMethods = _.keys(main._resolved)
main._blacklist.push('_resolve', '_exposeResolve', '_resolved', '_resolvedMethods')
_.extend(main, main._resolved)
main._blacklist = main._blacklist.concat(main._resolvedMethods)

main._resolveReference = function (methods) {
  return _.chain(methods)
  .map(function (method) {
    var name = method.replace(/^_/, '')
    return [name, function () {
      var args = _.values(arguments)
      return function (req, res, next) {
        var resolvedArgs = Req.resolveAll(req, _.rest(args))
        resolvedArgs.unshift(Req.getRef(_.first(args)))
        return main[method].apply(null, resolvedArgs)(req, res, next)
      }
    }]
  })
  .object()
  .value()
}

main._resolvedReverence = main._resolveReference(main._assignmentMethods)
main._resolvedReverenceMethods = _.keys(main._resolvedReverence)
main._blacklist.push('_resolveReference', '_resolvedReverence', '_resolvedReverenceMethods')
_.extend(main, main._resolvedReverence)
main._blacklist = main._blacklist.concat(main._resolvedReverenceMethods)

// main.push = function (fn) {
//   return fn
// }

main = gatherable(main, 'assemble')

main.prototype.concat = function (arr) {
  this._gather = _.flatten([this._gather, arr])
  return this
}

main.prototype.push = main.prototype.concat

module.exports = main

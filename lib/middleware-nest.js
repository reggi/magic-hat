var _ = require('lodash')
var express = require('express')

/** Allow for middleware to run from within middleware. */
function main (req, res, next, Router, middleware) {
  var args = _.values(arguments)
  middleware = _.flatten([_.slice(args, 4)])
  Router = (Router) ? Router : express.Router
  var router = Router({mergeParams: true})
  var nextRoute = true
  middleware.push(function (req, res, next) {
    nextRoute = false
    return next()
  })
  router.all('*', middleware)
  return router(req, res, function (nextValue) {
    if (nextRoute && !nextValue) return next('route')
    return next(nextValue)
  })
}

main.applyRouter = function (Router) {
  Router = (Router) ? Router : express.Router
  return function () {
    var args = _.values(arguments)
    args.splice(3, 0, Router)
    return main.apply(null, args)
  }
}

module.exports = main

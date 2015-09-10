var assert = require('assert')
var gatherable = require('../lib/gatherable')
/* global describe, it */
describe('gatherable', function () {
  it('should work as normal assert values', function () {
    var main = {}
    main.one = function () { return 1 }
    main.two = function () { return 2 }
    main.three = function () { return 3 }
    assert.equal(main.one(), 1)
    assert.equal(main.two(), 2)
    assert.equal(main.three(), 3)
  })
  it('should work as normal assert array', function () {
    var main = {}
    main.one = function () { return 1 }
    main.two = function () { return 2 }
    main.three = function () { return 3 }
    assert.deepEqual([
      main.one(),
      main.two(),
      main.three()
    ], [1, 2, 3])
  })
  it('should make gatherable from object', function () {
    var main = {}
    main.one = function () { return 1 }
    main.two = function () { return 2 }
    main.three = function () { return 3 }
    main = gatherable(main)
    var arr = main()
    .one()
    .two()
    .three()
    .value()
    assert.deepEqual(arr, [1, 2, 3])
  })
  it('should make gatherable from function with methods', function () {
    function Replacement () {
      if (!(this instanceof Replacement)) return new Replacement()
      this._gather = []
    }
    Replacement.check = true
    var Main = {}
    Main.one = function () { return 1 }
    Main.two = function () { return 2 }
    Main.three = function () { return 3 }
    Main = gatherable(Main, 'exit', 'Main', Replacement)
    var arr = Main()
    .one()
    .two()
    .three()
    .exit()
    assert.deepEqual(arr, [1, 2, 3])
    assert.equal(Main.name, 'Main')
    assert.equal(Main.check, true)
  })
})

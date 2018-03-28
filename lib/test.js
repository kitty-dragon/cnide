const parser  = require('../build/parser')
const network = require('./network')
const utils   = require('./utils')

function check_assert(actual, operator, expected) {
  switch (operator) {
    case '=':  return actual === expected
    case '=':  return actual !== expected
    case '>=': return actual >= expected
    case '<=': return actual <= expected
    case '>':  return actual > expected
    case '<':  return actual < expected
  }
}

class Test {
  constructor(network) {
    this.network  = network
    this.asserts  = []
    this.pulses   = []
    this.prints   = []
    this.max_tick = 0
  }

  add(child) {
    if (child.type === 'assert') {
      // expand each to "everything non-defined"
      let used_keys = Object.create(null)

      for (let assertion of child.values) {
        if (assertion.key === 'each') {
          assertion.used_keys = used_keys
        } else {
          used_keys[assertion.key] = true
        }
      }

      this.asserts.push(child)
    } else if (child.type === 'pulse') {
      this.pulses.push(child)
    } else if (child.type === 'print') {
      this.prints.push(child)
    }

    this.max_tick = this.max_tick < child.end ? child.end : this.max_tick
  }

  run(cn) {
    cn.tick = 0
    cn.state = {}

    while (true) {
      for (let print of this.prints) {
        if (cn.tick < print.start || cn.tick > print.end) continue

        console.log(`${cn.tick}:`, print.wire, cn.state[print.wire] || {})
      }

      for (let assert of this.asserts) {
        if (cn.tick < assert.start || cn.tick > assert.end) continue

        for (let { key, operator, value, used_keys } of assert.values) {
          if (key === 'each') {
            for (let signal of Object.keys(cn.state[assert.wire] || {})) {
              if (used_keys[signal]) continue
              let actual = cn.state[assert.wire][signal] || 0
              let success = check_assert(actual, operator, value)
              if (!success) throw new Error(`Assertion failed at tick ${cn.tick} in each: ${signal}=${actual} ${operator} ${value}`);
            }
          } else {
            let actual = (cn.state[assert.wire] || {})[key] || 0
            let success = check_assert(actual, operator, value)
            if (!success) throw new Error(`Assertion failed at tick ${cn.tick}: ${key}=${actual} ${operator} ${value}`);
          }
        }
      }

      for (let pulse of this.pulses) {
        if (cn.tick < pulse.start || cn.tick > pulse.end) continue
        cn.state[pulse.wire] = cn.state[pulse.wire] || {}
        utils.mergeSignals(cn.state[pulse.wire], pulse.values)
      }

      if (cn.tick >= this.max_tick) break
      cn.step()
    }
  }
}

class TestSuite {
  constructor() {
    this.networks = null
    this.tests    = null
  }

  async parse(src) {
    let result = parser.parse(src)

    this.networks = Object.create(null)
    this.tests = Object.create(null)

    for (let [ type, value ] of result) {
      if (type === 'network') {
        if (this.networks[value.name]) throw new Error('Duplicate network name: ' + value[0].name)
        this.networks[value.name] = value
      } else if (type === 'test') {
        this.tests[value.network] = this.tests[value.network] || []
        this.tests[value.network].push(value)
      }
    }
  }

  run() {
    let result = []

    for (let network of Object.keys(this.tests)) {
      if (!this.networks[network]) {
        throw new Error('Network ' + network + ' not found')
      }

      let cn = this.networks[network].create(this.networks)

      for (let test of this.tests[network]) {
        result.push(test.run(cn))
      }
    }
  }
}

module.exports = async function test(src) {
  let t = new TestSuite()
  await t.parse(src)
  return t.run()
}

module.exports.TestSuite = TestSuite
module.exports.Test      = Test

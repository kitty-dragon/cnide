const pako = require('pako/lib/deflate')
const network = require('../')

module.exports = function (cn, to_json = false) {
  // TODO: make this extendable through language syntax
  const signals_str = 'signal-0 signal-1 signal-2 signal-3 signal-4 signal-5 signal-6 signal-7 signal-8 signal-9 signal-A signal-B signal-C signal-D signal-E signal-F signal-G signal-H signal-I signal-J signal-K signal-L signal-M signal-N signal-O signal-P signal-Q signal-R signal-S signal-T signal-U signal-V signal-W signal-X signal-Y signal-Z signal-red signal-green signal-blue signal-yellow signal-pink signal-cyan signal-white signal-grey signal-black'
  const items_str = 'wooden-chest iron-chest steel-chest storage-tank transport-belt fast-transport-belt express-transport-belt underground-belt fast-underground-belt express-underground-belt splitter fast-splitter express-splitter burner-inserter inserter long-handed-inserter fast-inserter filter-inserter stack-inserter stack-filter-inserter small-electric-pole medium-electric-pole big-electric-pole substation pipe pipe-to-ground pump rail train-stop rail-signal rail-chain-signal locomotive cargo-wagon fluid-wagon artillery-wagon car tank logistic-robot construction-robot logistic-chest-active-provider logistic-chest-passive-provider logistic-chest-storage logistic-chest-buffer logistic-chest-requester roboport small-lamp red-wire green-wire arithmetic-combinator decider-combinator constant-combinator power-switch programmable-speaker stone-brick concrete hazard-concrete refined-concrete refined-hazard-concrete landfill cliff-explosives iron-axe steel-axe repair-pack blueprint deconstruction-planner blueprint-book boiler steam-engine steam-turbine solar-panel accumulator nuclear-reactor heat-exchanger heat-pipe burner-mining-drill electric-mining-drill offshore-pump pumpjack stone-furnace steel-furnace electric-furnace assembling-machine-1 assembling-machine-2 assembling-machine-3 oil-refinery chemical-plant centrifuge lab beacon speed-module speed-module-2 speed-module-3 effectivity-module effectivity-module-2 effectivity-module-3 productivity-module productivity-module-2 productivity-module-3 raw-wood coal stone iron-ore copper-ore uranium-ore raw-fish wood iron-plate copper-plate solid-fuel steel-plate plastic-bar sulfur battery explosives crude-oil-barrel heavy-oil-barrel light-oil-barrel lubricant-barrel petroleum-gas-barrel sulfuric-acid-barrel water-barrel copper-cable iron-stick iron-gear-wheel empty-barrel electronic-circuit advanced-circuit processing-unit engine-unit electric-engine-unit flying-robot-frame satellite rocket-control-unit low-density-structure rocket-fuel nuclear-fuel uranium-235 uranium-238 uranium-fuel-cell used-up-uranium-fuel-cell science-pack-1 science-pack-2 science-pack-3 military-science-pack production-science-pack high-tech-science-pack space-science-pack pistol submachine-gun shotgun combat-shotgun rocket-launcher flamethrower land-mine firearm-magazine piercing-rounds-magazine uranium-rounds-magazine shotgun-shell piercing-shotgun-shell cannon-shell explosive-cannon-shell uranium-cannon-shell explosive-uranium-cannon-shell artillery-shell rocket explosive-rocket atomic-bomb flamethrower-ammo grenade cluster-grenade poison-capsule slowdown-capsule defender-capsule distractor-capsule destroyer-capsule discharge-defense-remote artillery-targeting-remote light-armor heavy-armor modular-armor power-armor power-armor-mk2 solar-panel-equipment fusion-reactor-equipment energy-shield-equipment energy-shield-mk2-equipment battery-equipment battery-mk2-equipment personal-laser-defense-equipment discharge-defense-equipment exoskeleton-equipment personal-roboport-equipment personal-roboport-mk2-equipment night-vision-equipment stone-wall gate gun-turret laser-turret flamethrower-turret artillery-turret radar rocket-silo'
  const fluids_str = 'water crude-oil steam heavy-oil light-oil petroleum-gas sulfuric-acid lubricant'

  function str_to_hash(s) {
    const res = {}
    s.split(' ').forEach(n => { res[n.toLowerCase().replace(/-/g, '_')] = n })
    return res
  }

  const items   = str_to_hash(items_str)
  const fluids  = str_to_hash(fluids_str)
  const signals = str_to_hash(signals_str)

  function get_item(s) {
    if (s === 'each') return { type: 'virtual', name: 'signal-each' }
    if (s === 'any')  return { type: 'virtual', name: 'signal-anything' }
    if (s === 'all')  return { type: 'virtual', name: 'signal-everything' }
    if (items[s])     return { type: 'item', name: items[s] }
    if (fluids[s])    return { type: 'fluid', name: fluids[s] }
    if (signals[s])   return { type: 'virtual', name: signals[s] }
    throw new Error('Unknown item: ' + s)
  }

  const arithmetic_operator_map = {
    '/': '/',
    '*': '*',
    '-': '-',
    '+': '+',
    // TODO: real "^" (exponentiation) missing
    '^': 'XOR',
    '%': '%',
    '>>': '>>',
    '<<': '<<',
    '|': 'OR',
    '&': 'AND'
  }

  const decider_operator_map = {
    '!=': '≠',
    '<=': '≤',
    '>=': '≥',
    '=': '=',
    '>': '>',
    '<': '<'
  }

  function has_many_outputs(element) {
    return element instanceof network.combinators.ArithmeticCombinator ||
           element instanceof network.combinators.DeciderCombinator
  }

  const blueprint = {
    icons: [
      {
        signal: {
          type: 'item',
          name: 'red-wire'
        },
        index: 1
      }
    ]
  }

  blueprint.entities = []

  const entities = new WeakMap()

  for (const element of cn.children) {
    const entity = { entity_number: 0 }

    // TODO: poles, labels, etc.
    if (element instanceof network.combinators.ConstantCombinator) {
      entity.name = 'constant-combinator'
    } else if (element instanceof network.combinators.ArithmeticCombinator) {
      entity.name = 'arithmetic-combinator'
    } else if (element instanceof network.combinators.DeciderCombinator) {
      entity.name = 'decider-combinator'
    } else if (element instanceof network.combinators.IO) {
      entity.name = 'constant-combinator'
    } else if (element instanceof network.combinators.Pole) {
      entity.name = 'medium-electric-pole'
    } else {
      throw new Error('Unable to export element: ' + element.constructor.name)
    }

    entity.position = {
      x: element.xPos,
      y: element.yPos
    }

    if (element instanceof network.combinators.ArithmeticCombinator ||
        element instanceof network.combinators.DeciderCombinator) {
      // for 1x2 items center is shifted 0.5 positions down
      entity.position.y += 0.5
    }

    if (element instanceof network.combinators.ConstantCombinator && Object.keys(element.values).length) {
      const filters = []
      entity.control_behavior = { filters }

      let index = 0

      for (const item of Object.keys(element.values)) {
        filters.push({
          signal: get_item(item),
          count:  element.values[item],
          index:  ++index
        })
      }
    }

    if (element instanceof network.combinators.ArithmeticCombinator) {
      let conditions = {}
      entity.control_behavior = { arithmetic_conditions: conditions }

      if (typeof element.left === 'number') {
        conditions.first_constant = element.left
      } else {
        conditions.first_signal = get_item(element.left)
      }

      if (typeof element.right === 'number') {
        conditions.second_constant = element.right
      } else {
        conditions.second_signal = get_item(element.right)
      }

      conditions.operation = arithmetic_operator_map[element.operator]
      conditions.output_signal = get_item(element.outputSignal)
    }

    if (element instanceof network.combinators.DeciderCombinator) {
      let conditions = {}
      entity.control_behavior = { decider_conditions: conditions }

      conditions.first_signal = get_item(element.left)

      if (typeof element.right === 'number') {
        conditions.constant = element.right
      } else {
        conditions.second_signal = get_item(element.right)
      }

      conditions.comparator = decider_operator_map[element.operator]
      conditions.output_signal = get_item(element.outputSignal)
      conditions.copy_count_from_input = !element.asOne
    }

    if (element instanceof network.combinators.IO && element.inputs.length) {
      const filters = []
      entity.control_behavior = { filters, is_on: false }

      const letters = element.inputs[0].toUpperCase()
                          .replace(/^[^A-Z]+|[^A-Z]+$/g, '')
                          .replace(/[^A-Z]+/g, ' ')

      let index = 0

      for (const l of letters.split('').slice(0, 18)) {
        index++

        if (!l.match(/^[A-Z]$/)) continue

        filters.push({
          signal: { type: 'virtual', name: 'signal-' + l },
          count:  1,
          index:  index
        })
      }
    }

    const newlen = blueprint.entities.push(entity)

    entity.entity_number = newlen
    entities.set(element, entity)
  }

  for (const segment of cn.segments) {
    const from = entities.get(segment.from.combinator)
    const to   = entities.get(segment.to.combinator)

    const from_idx = has_many_outputs(segment.from.combinator) ?
                     segment.from.hOffset + 1 :
                     1

    const from_wire = {}
    from_wire.entity_id = to.entity_number
    if (has_many_outputs(segment.to.combinator)) from_wire.circuit_id = segment.to.hOffset + 1

    from.connections = from.connections || {}
    from.connections[from_idx] = from.connections[from_idx] || {}
    from.connections[from_idx][segment.color] = from.connections[from_idx][segment.color] || []
    from.connections[from_idx][segment.color].push(from_wire)

    const to_idx = has_many_outputs(segment.to.combinator) ?
                   segment.to.hOffset + 1 :
                   1

    const to_wire = {}
    to_wire.entity_id = from.entity_number
    if (has_many_outputs(segment.from.combinator)) to_wire.circuit_id = segment.from.hOffset + 1

    to.connections = to.connections || {}
    to.connections[to_idx] = to.connections[to_idx] || {}
    to.connections[to_idx][segment.color] = to.connections[to_idx][segment.color] || []
    to.connections[to_idx][segment.color].push(to_wire)
  }

  blueprint.item = 'blueprint'
  blueprint.version = 0x00000010001e0001

  if (to_json) {
    return JSON.stringify(blueprint, null, 2)
  } else {
    if (typeof global && typeof global['Buf' + 'fer'] === 'function') {
      // node.js, try real hard to avoid it bundling in browser
      return '0' + global['Buf' + 'fer'](pako.deflate(JSON.stringify({ blueprint }))).toString('base64')
    } else {
      // browser
      return '0' + btoa(pako.deflate(JSON.stringify({ blueprint }), { to: 'string' }))
    }
  }
}

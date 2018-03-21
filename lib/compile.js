const parser  = require('../build/parser')
const network = require('./network')


module.exports = async function compile(src) {
  let result = parser.parse(src)

  let networks = Object.create(null)
  let tests = []

  for (let [ type, value ] of result) {
    if (type !== 'network') continue
    if (networks[value.name]) throw new Error('Duplicate network name: ' + value[0].name)
    networks[value.name] = value
  }

  if (!networks.Main) {
    throw new Error('No Main network was defined. ' +
                    'You must define a Main() {} network.')
  }

  return networks.Main.create(networks)
}

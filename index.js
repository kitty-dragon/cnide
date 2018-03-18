module.exports             = require('./lib/network')
module.exports.combinators = require('./lib/combinators')
module.exports.segmenting  = require('./lib/segmenting')
module.exports.serialize   = require('./lib/serialize')
module.exports.parse       = require('./build/parser').parse
module.exports.SyntaxError = require('./build/parser').SyntaxError

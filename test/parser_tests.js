const assert = require('assert')
const compile = require('../').compile

const assertParses = async function (code, statementCount) {
  const result = await compile(code);
  assert.equal(result.children.length, statementCount,
      'Expected %d statements but got %o', statementCount, result);
}

const assertNotParses = async function (code, regexp) {
  let result;

  try {
    result = await compile(code);
  } catch (e) {
    assert(regexp.test(e.message), 'Expected Error but got %o', result);
  }
}

const m = function(body) {
  return 'Main() {' + body + '}';
}

it('parser_notParsesNothing', () => assertNotParses('', /No Main network/));
it('parser_parsesEmptyMain', () => assertParses(m(''), 0));
it('parser_parsesComments', () => assertParses(m('// comment\n'), 0));
it('parser_parsesCommentsOutsideMain', () =>
  assertParses('// comment\n' + m('') + '//comment', 0));
it('parser_parsesCommentsTerminatedByNewline', () =>
  assertParses(m('// comment\n{x:1}->W'), 1));
it('parser_parsesMultiLineComment', () =>
  assertParses(m('/* One\nTwo\nThree\n */'), 0));
it('parser_parsesMultiLineCommentWithAsterisks', () =>
  assertParses(m('/** One\n * Two\n * Th*ee\n **/'), 0));
it('parser_parsesMultiLineCommentAsWhitespace', () =>
  assertParses(m(
      '/* comment *//* comment */{x:/* comment */1/* comment */}\n' +
      '/* comment */->/* comment */W/* comment */'), 1));

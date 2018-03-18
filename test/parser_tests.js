const assert = require('assert')
const parse = require('../').parse
const SyntaxError = require('../').SyntaxError

const assertParses = function(code, statementCount) {
  const result = parse(code);
  assert.equal(result.children.length, statementCount,
      'Expected %d statements but got %o', statementCount, result);
}

const assertNotParses = function(code) {
  try {
    const result = parse(code);
    assert(false, 'Expected Syntax Error but got %o', result);
  } catch (e) {
    if (e instanceof SyntaxError) {
      return;
    } else {
      throw e;
    }
  }
}

const m = function(body) {
  return 'Main() {' + body + '}';
}

it('parser_notParsesNothing', () => { assertNotParses(''); });
it('parser_parsesEmptyMain', () => { assertParses(m(''), 0); });
it('parser_parsesComments', () => { assertParses(m('// comment\n'), 0); });
it('parser_parsesCommentsOutsideMain', () => {
  assertParses('// comment\n' + m('') + '//comment', 0); });
it('parser_parsesCommentsTerminatedByNewline', () => {
  assertParses(m('// comment\n{x:1}->W'), 1); });
it('parser_parsesMultiLineComment', () => {
  assertParses(m('/* One\nTwo\nThree\n */'), 0); });
it('parser_parsesMultiLineCommentWithAsterisks', () => {
  assertParses(m('/** One\n * Two\n * Th*ee\n **/'), 0); });
it('parser_parsesMultiLineCommentAsWhitespace', () => {
  assertParses(m(
      '/* comment *//* comment */{x:/* comment */1/* comment */}\n' +
      '/* comment */->/* comment */W/* comment */'), 1); });

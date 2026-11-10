import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { findMathRange, scanOpenMathZone } from './MathInputPlugin';

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*' },
    text: {},
  },
});

test.each([
  ['$x$', 3, { from: 1, to: 4, latex: 'x', display: false }],
  ['a $x$ b', 5, { from: 3, to: 6, latex: 'x', display: false }],
  ['$$E=mc^2$$', 10, { from: 1, to: 11, latex: 'E=mc^2', display: true }],
  ['a $x$ and $y$', 13, { from: 11, to: 14, latex: 'y', display: false }],
  ['$$x$y$', 6, { from: 4, to: 7, latex: 'y', display: false }],
  ['$$x$', 4, null],
  ['$x$$', 4, null],
  ['$$$$', 4, null],
  ['$   $', 5, null],
  ['just text', 5, null],
])('finds completed math in %s at position %i', (text, pos, expected) => {
  const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text(text))]);
  expect(findMathRange(EditorState.create({ doc }), pos)).toEqual(expected);
});

test('no dollar signs: no open zone', () => {
  expect(scanOpenMathZone('just some text')).toBeNull();
});

test('unclosed single $ is open', () => {
  expect(scanOpenMathZone('a $x')).toEqual({ openAt: 2, latex: 'x' });
});

test('closed single $..$ pair is not open', () => {
  expect(scanOpenMathZone('a $x$ b')).toBeNull();
});

test('text after a closed $..$ pair does not reopen a zone (regression)', () => {
  expect(scanOpenMathZone('Type math inline with $x$, or start a new line')).toBeNull();
});

test('unclosed $$ is open', () => {
  expect(scanOpenMathZone('a $$ for display')).toEqual({ openAt: 2, latex: ' for display' });
});

test('closed $$..$$ pair is not open', () => {
  expect(scanOpenMathZone('$$E=mc^2$$ done')).toBeNull();
});

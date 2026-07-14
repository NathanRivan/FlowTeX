import { isReversalOfLastMove } from './AutoPageBreakPlugin';

const node = (id) => ({ eq: (other) => other._id === id, _id: id });

test('blocks a pull that would immediately undo the last push of the same block', () => {
  const lastMove = { direction: 'push', pageLow: 0, pageHigh: 1, node: node('a') };
  expect(isReversalOfLastMove(lastMove, 'pull', 0, 1, node('a'))).toBe(true);
});

test('blocks a push that would immediately undo the last pull of the same block', () => {
  const lastMove = { direction: 'pull', pageLow: 2, pageHigh: 3, node: node('b') };
  expect(isReversalOfLastMove(lastMove, 'push', 2, 3, node('b'))).toBe(true);
});

test('allows the same direction to repeat (not a reversal)', () => {
  const lastMove = { direction: 'push', pageLow: 0, pageHigh: 1, node: node('a') };
  expect(isReversalOfLastMove(lastMove, 'push', 0, 1, node('a'))).toBe(false);
});

test('allows a move on a different page boundary', () => {
  const lastMove = { direction: 'push', pageLow: 0, pageHigh: 1, node: node('a') };
  expect(isReversalOfLastMove(lastMove, 'pull', 1, 2, node('a'))).toBe(false);
});

test('allows a move on the same boundary if it is a different block', () => {
  const lastMove = { direction: 'push', pageLow: 0, pageHigh: 1, node: node('a') };
  expect(isReversalOfLastMove(lastMove, 'pull', 0, 1, node('other'))).toBe(false);
});

test('no guard when there was no prior move', () => {
  expect(isReversalOfLastMove(null, 'push', 0, 1, node('a'))).toBe(false);
});

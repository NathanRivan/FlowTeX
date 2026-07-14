import { resolveNodePos } from './Editor';

// Minimal ProseMirror-doc-shaped fake: enough for resolveNodePos to walk.
function fakeDoc(nodes) {
  // nodes: [{ pos, typeName, attrs }]
  const size = nodes.length ? Math.max(...nodes.map((n) => n.pos)) + 1 : 0;
  return {
    content: { size },
    nodeAt: (pos) => {
      const hit = nodes.find((n) => n.pos === pos);
      return hit ? { type: { name: hit.typeName }, attrs: hit.attrs } : null;
    },
    descendants: (cb) => {
      for (const n of nodes) {
        if (cb({ type: { name: n.typeName }, attrs: n.attrs }, n.pos) === false) break;
      }
    },
  };
}

test('returns the guessed position when the node is still there', () => {
  const doc = fakeDoc([{ pos: 5, typeName: 'latexTable', attrs: { raw: 'X' } }]);
  expect(resolveNodePos(doc, 5, 'latexTable', (a) => a.raw === 'X')).toBe(5);
});

test('relocates the node when the guessed position is stale (moved by repagination)', () => {
  const doc = fakeDoc([{ pos: 40, typeName: 'latexTable', attrs: { raw: 'X' } }]);
  expect(resolveNodePos(doc, 5, 'latexTable', (a) => a.raw === 'X')).toBe(40);
});

test('relocates when the guessed position now points past the end of the doc', () => {
  const doc = fakeDoc([{ pos: 3, typeName: 'latexTable', attrs: { raw: 'X' } }]);
  expect(resolveNodePos(doc, 999, 'latexTable', (a) => a.raw === 'X')).toBe(3);
});

test('relocates when the guessed position now points at an unrelated node', () => {
  const doc = fakeDoc([
    { pos: 5, typeName: 'paragraph', attrs: {} },
    { pos: 12, typeName: 'latexTable', attrs: { raw: 'X' } },
  ]);
  expect(resolveNodePos(doc, 5, 'latexTable', (a) => a.raw === 'X')).toBe(12);
});

test('returns null when no matching node exists', () => {
  const doc = fakeDoc([{ pos: 5, typeName: 'paragraph', attrs: {} }]);
  expect(resolveNodePos(doc, 5, 'latexTable', (a) => a.raw === 'X')).toBeNull();
});

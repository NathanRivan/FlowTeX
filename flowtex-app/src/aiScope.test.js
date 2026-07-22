import { getDocOrientation } from './aiScope';

// Minimal stand-in for a ProseMirror Node: descendants() walks a flat list,
// which is all getDocOrientation actually calls on the doc.
function fakeDoc(nodes) {
  return { descendants: (fn) => nodes.forEach(n => fn(n)) };
}

test('pulls title, abstract, and outline from their dedicated node types', () => {
  const doc = fakeDoc([
    { type: { name: 'docTitle' }, textContent: 'My Paper' },
    { type: { name: 'heading' }, textContent: 'Introduction' },
    { type: { name: 'docAbstract' }, textContent: 'This paper studies things.' },
    { type: { name: 'heading' }, textContent: 'Methods' },
  ]);
  expect(getDocOrientation(doc)).toEqual({
    title: 'My Paper',
    abstract: 'This paper studies things.',
    outline: ['Introduction', 'Methods'],
  });
});

test('missing front matter yields empty orientation, not a throw', () => {
  expect(getDocOrientation(fakeDoc([]))).toEqual({ title: '', abstract: '', outline: [] });
});

test('truncates a long abstract to 500 chars', () => {
  const long = 'x'.repeat(600);
  const doc = fakeDoc([{ type: { name: 'docAbstract' }, textContent: long }]);
  expect(getDocOrientation(doc).abstract.length).toBe(500);
});

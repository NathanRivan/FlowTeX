import { matchLibraryReference } from './crossrefLookup';

const references = [
  { id: '1', title: 'Attention Is All You Need', source: 'NeurIPS' },
  { id: '2', title: 'A Survey of Deep Learning Optimizers', source: 'JMLR' },
];

test('matches a claim that clearly overlaps an existing reference title', () => {
  const match = matchLibraryReference('as shown in Attention Is All You Need, transformers dominate', references);
  expect(match?.id).toBe('1');
});

test('returns null when nothing scores confidently', () => {
  expect(matchLibraryReference('the sky is blue today', references)).toBeNull();
});

test('returns null for an empty library', () => {
  expect(matchLibraryReference('anything', [])).toBeNull();
});

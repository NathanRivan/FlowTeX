import { bibtexKey, referenceToBibtex, assignBibtexKeys, referencesToBibFile } from './referenceBibtex';

describe('bibtexKey', () => {
  test('derives surname + year', () => {
    expect(bibtexKey({ authors: 'Smith, John', year: '2023' })).toBe('smith2023');
  });

  test('falls back to title slug when no authors', () => {
    expect(bibtexKey({ title: 'A Paper', year: '2020' })).toBe('apaper2020');
  });

  test('collision gets a letter suffix', () => {
    const existing = new Set(['smith2023']);
    expect(bibtexKey({ authors: 'Smith, John', year: '2023' }, existing)).toBe('smith2023a');
  });
});

describe('referenceToBibtex', () => {
  test('maps type to bibtex entry type and fields', () => {
    const ref = { authors: 'Smith, John', title: 'Deep Learning', year: '2023', source: 'Nature', url_doi: 'https://doi.org/x', type: 'article' };
    const out = referenceToBibtex(ref, 'smith2023');
    expect(out).toContain('@article{smith2023,');
    expect(out).toContain('journal = {Nature}');
    expect(out).toContain('title = {Deep Learning}');
  });

  test('unknown type falls back to misc', () => {
    const out = referenceToBibtex({ title: 'X', type: 'nonsense' }, 'x2020');
    expect(out).toContain('@misc{x2020,');
  });

  test('braces in field values are stripped, not escaped', () => {
    const out = referenceToBibtex({ title: 'A {Weird} Title' }, 'k1');
    expect(out).toContain('title = {A Weird Title}');
  });
});

describe('assignBibtexKeys / referencesToBibFile', () => {
  test('same-author-year collisions get distinct keys', () => {
    const refs = [
      { id: 'a', authors: 'Smith, John', year: '2023' },
      { id: 'b', authors: 'Smith, John', year: '2023' },
    ];
    const map = assignBibtexKeys(refs);
    expect(map.get('a')).toBe('smith2023');
    expect(map.get('b')).toBe('smith2023a');
  });

  test('produces one @entry per reference separated by a blank line', () => {
    const refs = [{ id: 'a', title: 'One', year: '2020' }, { id: 'b', title: 'Two', year: '2021' }];
    const bib = referencesToBibFile(refs);
    expect(bib.split('\n\n')).toHaveLength(2);
  });
});

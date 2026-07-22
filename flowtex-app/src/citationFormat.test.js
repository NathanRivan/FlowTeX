import { formatCitation, formatBibliographyEntry, sortReferences } from './citationFormat';

const smith = { id: '1', title: 'A Paper', authors: 'Smith, John', year: '2023' };
const jones = { id: '2', title: 'Another', authors: 'Jones, Alice', year: '2021' };
const twoAuthors = { id: '3', title: 'Two Authors', authors: 'Smith, John and Doe, Jane', year: '2020' };
const threeAuthors = { id: '4', title: 'Three Authors', authors: 'Smith, John and Doe, Jane and Lee, Kim', year: '2019' };

describe('formatCitation — apa', () => {
  test('single reference', () => {
    expect(formatCitation([smith])).toBe('(Smith, 2023)');
  });

  test('two authors', () => {
    expect(formatCitation([twoAuthors])).toBe('(Smith & Doe, 2020)');
  });

  test('three or more authors uses et al.', () => {
    expect(formatCitation([threeAuthors])).toBe('(Smith et al., 2019)');
  });

  test('multiple sources at one point join with semicolons', () => {
    expect(formatCitation([smith, jones])).toBe('(Smith, 2023; Jones, 2021)');
  });

  test('no matching references falls back to a placeholder', () => {
    expect(formatCitation([])).toBe('(?)');
  });

  test('missing year falls back to n.d.', () => {
    expect(formatCitation([{ authors: 'Smith, John' }])).toBe('(Smith, n.d.)');
  });
});

describe('formatBibliographyEntry — apa', () => {
  test('full entry with source and url', () => {
    const ref = { title: 'Deep Learning', authors: 'Smith, John', year: '2023', source: 'Nature', url_doi: 'https://doi.org/x' };
    expect(formatBibliographyEntry(ref)).toBe('Smith, J. (2023). Deep Learning. Nature. https://doi.org/x');
  });

  test('missing authors omits the leading name', () => {
    expect(formatBibliographyEntry({ title: 'Anon Work', year: '2020' })).toBe('(2020). Anon Work.');
  });
});

describe('sortReferences — apa', () => {
  test('sorts alphabetically by first author surname, not citation order', () => {
    const sorted = sortReferences([smith, jones]);
    expect(sorted.map(r => r.id)).toEqual(['2', '1']); // Jones before Smith
  });
});

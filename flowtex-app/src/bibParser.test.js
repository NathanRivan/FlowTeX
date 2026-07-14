import { parseBibKeys } from './bibParser';

describe('parseBibKeys — valid cases', () => {
  test('single article entry', () => {
    const bib = `@article{smith2020,\n  author = {Smith, J.},\n  title = {A Paper},\n  year = {2020}\n}`;
    expect(parseBibKeys(bib)).toEqual(new Set(['smith2020']));
  });

  test('multiple entries of different types', () => {
    const bib = `
@book{knuth1997,
  author = {Knuth, D.},
  title = {The Art of Computer Programming}
}
@inproceedings{vaswani2017,
  author = {Vaswani, A. and others},
  title = {Attention is All You Need},
  year = {2017}
}
`;
    expect(parseBibKeys(bib)).toEqual(new Set(['knuth1997', 'vaswani2017']));
  });

  test('entry with hyphens, colons, and dots in the key', () => {
    const bib = `@misc{doe-2021:v1.2, note = {x}}`;
    expect(parseBibKeys(bib)).toEqual(new Set(['doe-2021:v1.2']));
  });

  test('empty/absent bibliography yields an empty set', () => {
    expect(parseBibKeys('')).toEqual(new Set());
    expect(parseBibKeys(null)).toEqual(new Set());
    expect(parseBibKeys(undefined)).toEqual(new Set());
  });
});

describe('parseBibKeys — edge cases', () => {
  test('@comment/@string/@preamble are not citable entries', () => {
    const bib = `
@comment{this is a note}
@string{ieee = "IEEE"}
@preamble{"\\newcommand{\\noop}{}"}
@article{real2020, title={Real}}
`;
    expect(parseBibKeys(bib)).toEqual(new Set(['real2020']));
  });

  test('field values containing braces do not confuse key extraction', () => {
    const bib = `@article{key1,\n  title = {Nested {braces} in {a} title},\n  year = {2020}\n}\n@article{key2, title={x}}`;
    expect(parseBibKeys(bib)).toEqual(new Set(['key1', 'key2']));
  });

  test('entry type is case-insensitive for the @comment/@string/@preamble exclusion', () => {
    const bib = `@COMMENT{ignored}\n@Article{key1, title={x}}`;
    expect(parseBibKeys(bib)).toEqual(new Set(['key1']));
  });

  test('whitespace between @type and the brace is tolerated', () => {
    const bib = `@article   {  key1 ,\n  title={x}\n}`;
    expect(parseBibKeys(bib)).toEqual(new Set(['key1']));
  });
});

import { scanCitations, scanRefs, scanLabels } from './citeRefScan';

describe('scanCitations', () => {
  test('single-key \\cite', () => {
    const hits = scanCitations('See \\cite{smith2020} for details.');
    expect(hits).toHaveLength(1);
    expect(hits[0].command).toBe('cite');
    expect(hits[0].keys).toEqual(['smith2020']);
  });

  test('\\citep and \\citet variants', () => {
    const hits = scanCitations('\\citep{a2020} and \\citet{b2021} agree.');
    expect(hits.map((h) => h.command)).toEqual(['citep', 'citet']);
    expect(hits.map((h) => h.keys)).toEqual([['a2020'], ['b2021']]);
  });

  test('comma-separated multi-key \\cite', () => {
    const hits = scanCitations('\\cite{key1,key2, key3}');
    expect(hits).toHaveLength(1);
    expect(hits[0].keys).toEqual(['key1', 'key2', 'key3']);
  });

  test('no citations present', () => {
    expect(scanCitations('Just plain text.')).toEqual([]);
  });

  test('positions are usable to slice the original text back out', () => {
    const text = 'A \\cite{x} B';
    const [hit] = scanCitations(text);
    expect(text.slice(hit.start, hit.end)).toBe('\\cite{x}');
  });

  test('empty argument produces an empty key list, not a crash', () => {
    const hits = scanCitations('\\cite{}');
    expect(hits).toHaveLength(1);
    expect(hits[0].keys).toEqual([]);
  });
});

describe('scanRefs', () => {
  test('\\ref, \\eqref, \\pageref are all recognized', () => {
    const hits = scanRefs('\\ref{fig:1} \\eqref{eq:2} \\pageref{sec:3}');
    expect(hits.map((h) => h.command)).toEqual(['ref', 'eqref', 'pageref']);
    expect(hits.map((h) => h.label)).toEqual(['fig:1', 'eq:2', 'sec:3']);
  });

  test('no refs present', () => {
    expect(scanRefs('nothing here')).toEqual([]);
  });
});

describe('scanLabels', () => {
  test('single label', () => {
    const hits = scanLabels('\\section{Intro}\\label{sec:intro}');
    expect(hits).toHaveLength(1);
    expect(hits[0].label).toBe('sec:intro');
  });

  test('multiple labels in one string', () => {
    const hits = scanLabels('\\label{a}\\label{b}');
    expect(hits.map((h) => h.label)).toEqual(['a', 'b']);
  });

  test('\\label is not confused with \\ref/\\eqref/\\pageref', () => {
    expect(scanRefs('\\label{a}')).toEqual([]);
    expect(scanLabels('\\ref{a}')).toEqual([]);
  });
});

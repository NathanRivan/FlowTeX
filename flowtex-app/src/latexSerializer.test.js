import { generateLaTeX } from './latexSerializer';

function fakeEditor(docContent) {
  return { getJSON: () => ({ type: 'doc', content: [{ type: 'page', content: docContent }] }) };
}

test('numbered katexDisplay exports to \\begin{equation}, unnumbered to \\[...\\]', () => {
  const numbered = generateLaTeX(fakeEditor([
    { type: 'katexDisplay', attrs: { latex: 'E=mc^2', numbered: true } },
  ]));
  expect(numbered).toBe('\\begin{equation}\nE=mc^2\n\\end{equation}');

  const unnumbered = generateLaTeX(fakeEditor([
    { type: 'katexDisplay', attrs: { latex: 'E=mc^2', numbered: false } },
  ]));
  expect(unnumbered).toBe('\\[E=mc^2\\]');
});

test('docTitle + docAuthor export \\title{}/\\author{} with a single \\maketitle after the author', () => {
  const tex = generateLaTeX(fakeEditor([
    { type: 'docTitle', content: [{ type: 'text', text: 'My Paper' }] },
    { type: 'docAuthor', content: [{ type: 'text', text: 'Ada Lovelace' }] },
  ]));
  expect(tex).toBe('\\title{My Paper}\n\n\\author{Ada Lovelace}\n\\maketitle');
});

test('docTitle alone (no author) still emits \\maketitle', () => {
  const tex = generateLaTeX(fakeEditor([
    { type: 'docTitle', content: [{ type: 'text', text: 'My Paper' }] },
  ]));
  expect(tex).toBe('\\title{My Paper}\n\\maketitle');
});

test('docAbstract exports to \\begin{abstract}...\\end{abstract}', () => {
  const tex = generateLaTeX(fakeEditor([
    { type: 'docAbstract', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Summary.' }] }] },
  ]));
  expect(tex).toBe('\\begin{abstract}\nSummary.\n\\end{abstract}');
});

describe('citations + bibliography', () => {
  beforeEach(() => {
    window.flumenwriteReferenceLibrary = new Map([
      ['ref-1', { id: 'ref-1', title: 'A Paper', authors: 'Smith, John', year: '2023' }],
    ]);
  });
  afterEach(() => { delete window.flumenwriteReferenceLibrary; });

  test('citation node exports \\cite{key} using a bibtexKey derived from the reference', () => {
    const tex = generateLaTeX(fakeEditor([
      { type: 'paragraph', content: [{ type: 'text', text: 'See ' }, { type: 'citation', attrs: { refIds: ['ref-1'] } }] },
    ]));
    expect(tex).toBe('See \\cite{smith2023}');
  });

  test('citation with no matching library entry exports nothing', () => {
    const tex = generateLaTeX(fakeEditor([
      { type: 'paragraph', content: [{ type: 'citation', attrs: { refIds: ['missing'] } }] },
    ]));
    expect(tex).toBe('');
  });

  test('docBibliography exports a thebibliography environment for cited refs only', () => {
    window.flumenwriteReferenceLibrary = new Map([
      ['ref-1', { id: 'ref-1', title: 'A Paper', authors: 'Smith, John', year: '2023' }],
      ['ref-2', { id: 'ref-2', title: 'Uncited', authors: 'Jones, Alice', year: '2021' }],
    ]);
    const tex = generateLaTeX(fakeEditor([
      { type: 'paragraph', content: [{ type: 'citation', attrs: { refIds: ['ref-1'] } }] },
      { type: 'docBibliography' },
    ]));
    expect(tex).toContain('\\begin{thebibliography}{99}');
    expect(tex).toContain('\\bibitem{smith2023} Smith, J. (2023). A Paper.');
    expect(tex).not.toContain('Jones');
  });

  test('docBibliography with no citations renders nothing', () => {
    const tex = generateLaTeX(fakeEditor([{ type: 'docBibliography' }]));
    expect(tex).toBe('');
  });
});

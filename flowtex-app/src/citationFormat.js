// Pluggable in-text citation / bibliography-entry formatters. Each style is
// a { inText, bibliographyEntry, sortKey } triple registered in FORMATTERS —
// add a new style there, nothing else (CitationExtension, DocBibliographyNode,
// latexSerializer) needs to change.

function splitAuthors(authors) {
  if (!authors) return [];
  return authors.split(/\s+and\s+/i).map(a => a.trim()).filter(Boolean);
}

// Authors are stored BibTeX-style ("Last, First and Last, First"), same
// field the .bib export writes back out verbatim — so surname extraction
// works for both "Smith, John" and a plain "John Smith" fallback.
function surname(author) {
  if (!author) return '';
  return author.includes(',') ? author.split(',')[0].trim() : author.trim().split(/\s+/).pop();
}

function apaInTextOne(ref) {
  const names = splitAuthors(ref.authors);
  const year = ref.year || 'n.d.';
  if (names.length === 0) return `${ref.title || 'Untitled'}, ${year}`;
  if (names.length === 1) return `${surname(names[0])}, ${year}`;
  if (names.length === 2) return `${surname(names[0])} & ${surname(names[1])}, ${year}`;
  return `${surname(names[0])} et al., ${year}`;
}

function apaInText(refs) {
  if (!refs || refs.length === 0) return '(?)';
  return `(${refs.map(apaInTextOne).join('; ')})`;
}

function apaAuthorsList(authors) {
  const names = splitAuthors(authors);
  if (names.length === 0) return '';
  const formatted = names.map(n => {
    if (!n.includes(',')) return n; // already "First Last" — leave as-is
    const [last, first] = n.split(',').map(s => s.trim());
    const initials = first ? first.split(/\s+/).map(p => p[0]?.toUpperCase() + '.').join(' ') : '';
    return initials ? `${last}, ${initials}` : last;
  });
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
}

function apaBibliographyEntry(ref) {
  const authors = apaAuthorsList(ref.authors);
  const year = ref.year || 'n.d.';
  const title = ref.title || 'Untitled';
  const source = ref.source ? ` ${ref.source}.` : '';
  const url = ref.url_doi ? ` ${ref.url_doi}` : '';
  const lead = authors ? `${authors} (${year}).` : `(${year}).`;
  return `${lead} ${title}.${source}${url}`.trim();
}

export const FORMATTERS = {
  apa: {
    inText: apaInText,
    bibliographyEntry: apaBibliographyEntry,
    sortKey: (ref) => `${surname(splitAuthors(ref.authors)[0]) || ref.title || ''}${ref.year || ''}`.toLowerCase(),
  },
};

export function formatCitation(refs, style = 'apa') {
  return (FORMATTERS[style] || FORMATTERS.apa).inText(refs);
}

export function formatBibliographyEntry(ref, style = 'apa') {
  return (FORMATTERS[style] || FORMATTERS.apa).bibliographyEntry(ref);
}

export function sortReferences(refs, style = 'apa') {
  const keyFn = (FORMATTERS[style] || FORMATTERS.apa).sortKey;
  return [...refs].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

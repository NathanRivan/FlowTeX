// Reference → BibTeX. Keys are derived deterministically from author surname
// + year (surname2023, with a letter suffix on collision) rather than the
// Supabase row id, so exported .tex/.bib pairs stay readable and match what
// a human editing the .bib by hand would have named the same entry.

const TYPE_TO_BIBTEX = {
  article: 'article',
  book: 'book',
  conference: 'inproceedings',
  thesis: 'phdthesis',
  report: 'techreport',
  website: 'misc',
  other: 'misc',
};

function slugPart(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function firstSurname(authors) {
  const first = (authors || '').split(/\s+and\s+/i)[0]?.trim() || '';
  return slugPart(first.includes(',') ? first.split(',')[0] : first.split(/\s+/).pop());
}

export function bibtexKey(ref, existingKeys = new Set()) {
  const base = `${firstSurname(ref.authors) || slugPart(ref.title) || 'ref'}${ref.year || ''}`;
  if (!existingKeys.has(base)) return base;
  let suffix = 'a';
  while (existingKeys.has(base + suffix)) suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
  return base + suffix;
}

// BibTeX field values only need their delimiter braces protected — unlike
// LaTeX body text, they aren't rendered, so & % $ # _ ~ ^ are left alone.
function escapeBibtex(text) {
  return (text || '').replace(/[{}]/g, '');
}

export function referenceToBibtex(ref, key) {
  const type = TYPE_TO_BIBTEX[ref.type] || 'misc';
  const sourceField = type === 'article' ? 'journal' : type === 'inproceedings' ? 'booktitle' : 'publisher';
  const fields = [
    ref.authors && `  author = {${escapeBibtex(ref.authors)}}`,
    ref.title && `  title = {${escapeBibtex(ref.title)}}`,
    ref.year && `  year = {${escapeBibtex(String(ref.year))}}`,
    ref.source && `  ${sourceField} = {${escapeBibtex(ref.source)}}`,
    ref.url_doi && `  url = {${escapeBibtex(ref.url_doi)}}`,
  ].filter(Boolean);
  return `@${type}{${key},\n${fields.join(',\n')}\n}`;
}

// One key per reference, assigned in the given order (deterministic across
// calls with the same input) so a .tex export's \cite{key} and a .bib
// export's @article{key,...} always agree.
export function assignBibtexKeys(refs) {
  const usedKeys = new Set();
  const map = new Map();
  refs.forEach(ref => {
    const key = bibtexKey(ref, usedKeys);
    usedKeys.add(key);
    map.set(ref.id, key);
  });
  return map;
}

export function referencesToBibFile(refs) {
  const keyMap = assignBibtexKeys(refs);
  return refs.map(ref => referenceToBibtex(ref, keyMap.get(ref.id))).join('\n\n');
}

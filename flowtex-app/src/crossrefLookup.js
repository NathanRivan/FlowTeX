// Resolves a suggest_citation claim against something real: the user's own
// reference library first, then a live CrossRef lookup. Never invents a
// source — if neither produces a confident match, callers should report
// "no citation found" rather than falling back to a guess.

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were', 'that', 'this', 'with', 'as', 'by', 'at', 'it', 'be']);

function significantWords(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
}

function overlapScore(a, b) {
  const wordsA = new Set(significantWords(a));
  const wordsB = significantWords(b);
  if (!wordsA.size || !wordsB.length) return 0;
  const shared = wordsB.filter(w => wordsA.has(w)).length;
  return shared / Math.min(wordsA.size, new Set(wordsB).size);
}

// Best existing library reference for a claim, or null if nothing scores
// well enough to be a confident match (guards against citing the wrong
// source just because it's the closest thing on file).
export function matchLibraryReference(claimText, references) {
  let best = null;
  let bestScore = 0;
  for (const ref of references) {
    const score = Math.max(overlapScore(claimText, ref.title), overlapScore(claimText, ref.source));
    if (score > bestScore) { bestScore = score; best = ref; }
  }
  return bestScore >= 0.5 ? best : null;
}

function fromCrossRefItem(item) {
  const author = (item.author || [])
    .map(a => [a.given, a.family].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' and ');
  const year = item.issued?.['date-parts']?.[0]?.[0];
  return {
    title: item.title?.[0] || '',
    authors: author,
    year: year ? String(year) : '',
    source: item['container-title']?.[0] || item.publisher || '',
    url_doi: item.DOI ? `https://doi.org/${item.DOI}` : '',
    type: item.type === 'book' ? 'book' : item.type === 'proceedings-article' ? 'conference' : 'article',
  };
}

// Real CrossRef API call — no key required. Returns null if CrossRef has
// nothing confidently matching the claim, rather than returning its
// best-effort (possibly unrelated) top hit.
export async function lookupCrossRef(claimText) {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(claimText)}&rows=1`;
  let json;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    json = await resp.json();
  } catch {
    return null;
  }
  const item = json?.message?.items?.[0];
  if (!item) return null;
  const candidate = fromCrossRefItem(item);
  if (!candidate.title || overlapScore(claimText, candidate.title) < 0.35) return null;
  return candidate;
}

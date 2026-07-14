/**
 * Minimal BibTeX key extractor. We only need the set of citable entry keys
 * (for \cite resolution), not a full bibliographic model — so this reads
 * just enough structure to find `@type{key,` headers and ignores field
 * values entirely, which keeps it robust against `{}`/quote nesting inside
 * field bodies that a full parser would need to balance-track.
 */

const NON_ENTRY_TYPES = new Set(['comment', 'string', 'preamble']);

export function parseBibKeys(bibText) {
  const keys = new Set();
  if (!bibText) return keys;

  const re = /@\s*([a-zA-Z]+)\s*\{\s*([^,\s}]+)\s*,/g;
  let m;
  while ((m = re.exec(bibText)) !== null) {
    const type = m[1].toLowerCase();
    if (NON_ENTRY_TYPES.has(type)) continue;
    keys.add(m[2]);
  }
  return keys;
}

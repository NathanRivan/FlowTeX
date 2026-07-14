/**
 * Regex-based scanners for \cite-family, \ref-family, and \label commands
 * in a plain text string. Positions returned are offsets into `text`, so
 * callers add their own base offset (paragraph position, or an atom node's
 * own attrs string) to get absolute document coordinates.
 *
 * Deliberately flat `[^}]*` argument matching (no nested-brace tracking):
 * citation keys and labels are plain identifiers in every real-world corpus
 * we've seen, and this mirrors the same simplification mathPreprocessor.js
 * already makes for \label/\ref/\cite when rendering math.
 */

// Exported so mathPreprocessor.js's KaTeX-display stripping stays in sync
// with the exact command set this scanner (and therefore validation) knows
// about — drifting the two lists apart would make \eqref/\citep etc. show
// up as false-positive "Undefined control sequence" KaTeX warnings.
export const CITE_COMMANDS = ['citep', 'citet', 'cite'];
export const REF_COMMANDS = ['eqref', 'pageref', 'ref'];

function splitKeys(raw) {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function scanCommand(text, names) {
  const re = new RegExp(`\\\\(${names.join('|')})\\{([^}]*)\\}`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ command: m[1], arg: m[2], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function scanCitations(text) {
  if (!text) return [];
  return scanCommand(text, CITE_COMMANDS).map((hit) => ({
    ...hit,
    keys: splitKeys(hit.arg),
  }));
}

export function scanRefs(text) {
  if (!text) return [];
  return scanCommand(text, REF_COMMANDS).map((hit) => ({
    ...hit,
    label: hit.arg.trim(),
  }));
}

export function scanLabels(text) {
  if (!text) return [];
  return scanCommand(text, ['label']).map((hit) => ({
    ...hit,
    label: hit.arg.trim(),
  }));
}

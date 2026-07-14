import { validateEquationLatex } from './katexValidate';
import { scanCitations, scanRefs } from './citeRefScan';

/**
 * Combines the three checks that can mark a *committed equation*: KaTeX's
 * own parse check, plus \cite/\ref resolution for commands typed inside the
 * equation (the app's existing convention — see mathPreprocessor.js, which
 * already special-cases \label/\ref/\cite for math display).
 *
 * Session-scoped, content-keyed dismissal for the one class of KaTeX
 * "error" we treat as a soft warning (see katexValidate.js) — no schema/doc
 * changes, so dismissing just means "don't show this exact warning again
 * until the equation's source actually changes".
 */
const dismissedWarnings = new Set();

export function dismissWarning(key) {
  if (key) dismissedWarnings.add(key);
}

export function computeEquationMarker(latex) {
  const issues = [];

  const katexResult = validateEquationLatex(latex);
  if (!katexResult.ok) {
    const dismissKey = katexResult.severity === 'warning' ? `katex:${latex}` : null;
    if (!(dismissKey && dismissedWarnings.has(dismissKey))) {
      issues.push({
        severity: katexResult.severity,
        message: katexResult.position != null
          ? `${katexResult.message} (position ${katexResult.position})`
          : katexResult.message,
        dismissKey,
      });
    }
  }

  const bibKeys = window.flumenwriteBibKeys || new Set();
  scanCitations(latex).forEach(({ keys }) => {
    const missing = keys.filter((k) => !bibKeys.has(k));
    if (missing.length) {
      issues.push({
        severity: 'error',
        message: `no matching entry in bibliography for ${missing.join(', ')}`,
        dismissKey: null,
      });
    }
  });

  const labelDefs = window.flumenwriteLabelDefs || new Set();
  scanRefs(latex).forEach(({ label }) => {
    if (label && !labelDefs.has(label)) {
      issues.push({ severity: 'error', message: `no matching \\label for "${label}"`, dismissKey: null });
    }
  });

  if (!issues.length) return null;
  const severity = issues.some((i) => i.severity === 'error') ? 'error' : 'warning';
  // Only offer a dismiss affordance when it's the sole issue on this
  // equation — a real error elsewhere shouldn't be hideable via the
  // unrelated warning's dismiss control.
  const dismissKey = issues.length === 1 ? issues[0].dismissKey : null;
  return { severity, message: issues.map((i) => i.message).join('\n'), dismissKey };
}

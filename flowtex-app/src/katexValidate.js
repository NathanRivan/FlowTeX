import katex from 'katex';
import { preprocessMathForDisplay } from './mathPreprocessor';

/**
 * Strictness decision (see task report for the measured false-positive
 * rate behind this):
 *
 *   throwOnError: true   — required to get a structured KaTeX ParseError
 *                          (message + position) instead of inline red text.
 *   strict: false         — KaTeX's `strict` mode governs a *different* class
 *                          of issue (deprecated-but-renderable constructs,
 *                          unusual unicode, etc.) than actual parse failures;
 *                          leaving it strict would add warnings-as-errors
 *                          for things that still render fine, on top of the
 *                          genuine risk below. We turn it off rather than
 *                          use throwOnError:false, so we still get
 *                          structured errors for real breakage.
 *
 * The one real false-positive source we can't configure away: a macro from
 * a LaTeX package KaTeX doesn't implement (e.g. \SI, custom \newcommand
 * names not in the document's preamble) always throws, because KaTeX simply
 * doesn't know the command — regardless of strict/throwOnError. KaTeX's
 * error message for exactly this case is distinctively
 * "Undefined control sequence: \\xxx", which is NOT used for genuine syntax
 * breakage (unbalanced braces, stray '&', etc. — see katexValidate.test.js).
 * We use that message shape to downgrade this one class to a dismissible
 * 'warning' instead of a hard 'error'.
 */

const UNDEFINED_CONTROL_SEQUENCE = /^KaTeX parse error: Undefined control sequence/;

export function validateEquationLatex(rawLatex) {
  const processed = preprocessMathForDisplay(rawLatex);
  if (!processed.trim()) return { ok: true };

  try {
    katex.renderToString(processed, { throwOnError: true, strict: false });
    return { ok: true };
  } catch (e) {
    if (!(e instanceof katex.ParseError)) {
      // Not a parse failure (e.g. a DOM/environment error) — don't flag it
      // as equation content being broken.
      return { ok: true };
    }
    const severity = UNDEFINED_CONTROL_SEQUENCE.test(e.message) ? 'warning' : 'error';
    return {
      ok: false,
      severity,
      message: e.message.replace(/^KaTeX parse error: /, ''),
      position: typeof e.position === 'number' ? e.position : null,
    };
  }
}

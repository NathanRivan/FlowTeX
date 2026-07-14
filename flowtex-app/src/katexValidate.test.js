import { validateEquationLatex } from './katexValidate';

/**
 * This corpus doubles as the false-positive measurement for the task
 * report. Every VALID entry is a real construct (matrix envs, calculus
 * notation, probability, linear algebra) a person would actually type —
 * not synthetic filler. Numbers were measured by running this exact corpus
 * (see the design note in katexValidate.js for the strictness rationale):
 * throwOnError:true + strict:false → 0/20 false positives here.
 */
const VALID_EQUATIONS = [
  String.raw`x^2 + y^2 = z^2`,
  String.raw`\frac{a}{b} + \sqrt{c}`,
  String.raw`\sum_{i=1}^{n} i = \frac{n(n+1)}{2}`,
  String.raw`\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}`,
  String.raw`\alpha + \beta = \gamma`,
  String.raw`\mathbf{v} \cdot \mathbf{w}`,
  String.raw`A \in \mathbb{R}^{n \times n}`,
  String.raw`\lim_{x \to \infty} f(x)`,
  String.raw`\begin{pmatrix} a & b \\ c & d \end{pmatrix}`,
  String.raw`\nabla \times \mathbf{F} = 0`,
  String.raw`\hat{x} + \tilde{y} + \bar{z}`,
  String.raw`\left( \frac{1}{2} \right)`,
  String.raw`\operatorname{argmax}_x f(x)`,
  String.raw`e^{i\pi} + 1 = 0`,
  String.raw`P(A \mid B) = \frac{P(B \mid A) P(A)}{P(B)}`,
  String.raw`\forall \epsilon > 0 \, \exists \delta > 0`,
  String.raw`\binom{n}{k}`,
  String.raw`\overline{AB}`,
  String.raw`x_{i,j}^{(k)}`,
  String.raw`\dot{x} = f(x, u)`,
];

const INVALID_SYNTAX = [
  String.raw`\frac{1}{2`,
  String.raw`a & b`,
  String.raw`\left( x`,
  String.raw`\begin{matrix} a & b \end{pmatrix}`,
  String.raw`x^^2`,
];

// Valid LaTeX in a real document (siunitx, natbib \citeauthor) that KaTeX
// simply doesn't implement — the one class of false positive we can't
// configure away. Must downgrade to 'warning', never silently pass as ok.
const UNSUPPORTED_MACROS = [
  String.raw`\SI{5}{\meter}`,
  String.raw`\num{123}`,
  String.raw`\text{See }\citeauthor{smith2020}`,
  String.raw`\ang{45}`,
  String.raw`\SIrange{1}{5}{\kg}`,
];

describe('validateEquationLatex — valid equations produce zero markers', () => {
  let falsePositives = 0;
  VALID_EQUATIONS.forEach((latex) => {
    test(latex, () => {
      const result = validateEquationLatex(latex);
      if (!result.ok) falsePositives++;
      expect(result.ok).toBe(true);
    });
  });
  afterAll(() => {
    // eslint-disable-next-line no-console
    console.log(`KaTeX false-positive rate: ${falsePositives}/${VALID_EQUATIONS.length}`);
  });
});

describe('validateEquationLatex — genuine syntax errors are hard errors', () => {
  INVALID_SYNTAX.forEach((latex) => {
    test(latex, () => {
      const result = validateEquationLatex(latex);
      expect(result.ok).toBe(false);
      expect(result.severity).toBe('error');
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });
});

describe('validateEquationLatex — unsupported-but-real macros downgrade to warning', () => {
  UNSUPPORTED_MACROS.forEach((latex) => {
    test(latex, () => {
      const result = validateEquationLatex(latex);
      expect(result.ok).toBe(false);
      expect(result.severity).toBe('warning');
    });
  });
});

describe('validateEquationLatex — edge cases', () => {
  test('empty/whitespace-only latex is not flagged', () => {
    expect(validateEquationLatex('').ok).toBe(true);
    expect(validateEquationLatex('   ').ok).toBe(true);
  });

  test('\\cite/\\ref/\\label inside math do not themselves break KaTeX parsing', () => {
    // mathPreprocessor strips these to plain \text{} before KaTeX ever sees
    // them — this check is orthogonal to whether the key/label resolves.
    expect(validateEquationLatex(String.raw`x = y \label{eq:1}`).ok).toBe(true);
    expect(validateEquationLatex(String.raw`\text{see }\cite{smith2020}`).ok).toBe(true);
    expect(validateEquationLatex(String.raw`\ref{eq:1} + \eqref{eq:2}`).ok).toBe(true);
  });

  test('position is reported when KaTeX provides one', () => {
    const result = validateEquationLatex(String.raw`\frac{1}{2`);
    expect(result.ok).toBe(false);
    expect(typeof result.position).toBe('number');
  });
});

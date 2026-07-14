import { importLaTeX } from './latexImporter';
import { parseTableSource } from './tableParser';

// Regression checks for the balanced-brace / nested-list bugs fixed in
// latexImporter.js — plain non-greedy regexes broke on nested braces/lists.

test('bold heading with nested braces imports without stray braces', () => {
  const html = importLaTeX('\\begin{document}\\section*{\\textbf{Intro}}\\end{document}');
  expect(html).toContain('<h1><strong>Intro</strong></h1>');
  expect(html).not.toContain('}');
});

test('nested itemize keeps sub-items nested instead of flattening', () => {
  const tex = `\\begin{document}
\\begin{itemize}
\\item First
\\begin{itemize}
\\item Nested A
\\item Nested B
\\end{itemize}
\\item Second
\\end{itemize}
\\end{document}`;
  const html = importLaTeX(tex);
  expect(html).toContain('<li>First');
  expect(html).toContain('<ul><li>Nested A</li><li>Nested B</li></ul>');
  expect(html).not.toMatch(/\\end\{itemize\}/);
});

test('highlight colorbox round-trips to a colored mark', () => {
  const html = importLaTeX('\\begin{document}\\colorbox[HTML]{FFFF00}{hi}\\end{document}');
  expect(html).toContain('<mark data-color="#FFFF00" style="background-color:#FFFF00">hi</mark>');
});

test('strikethrough and monospace commands import to marks', () => {
  const html = importLaTeX('\\begin{document}\\st{gone} and \\texttt{code}\\end{document}');
  expect(html).toContain('<s>gone</s>');
  expect(html).toContain('<code>code</code>');
});

// Integration checks for the table import pipeline: importLaTeX runs several
// other regex passes (math conversion, text formatting, comment stripping)
// between preamble-stripping and paragraph-wrapping, so a table's raw source
// must survive all of them untouched via the sentinel-token swap, not just
// parse correctly in isolation (tableRoundtrip.test.js covers that).
describe('table import integration', () => {
  test('a bare tabular imports to a data-table-src div with source intact', () => {
    const tex = `\\begin{document}
Some text before.

\\begin{tabular}{lcc}
\\toprule
Method & Accuracy & F1 \\\\
\\midrule
Ours & 0.84 & 0.81 \\\\
\\bottomrule
\\end{tabular}

Some text after.
\\end{document}`;
    const html = importLaTeX(tex);
    expect(html).toContain('data-table-src="');
    expect(html).not.toMatch(/TABLE\d/); // sentinel must not leak into output
    expect(html).toContain('Some text before');
    expect(html).toContain('Some text after');

    const match = html.match(/data-table-src="([^"]*)"/);
    const raw = match[1].replace(/&quot;/g, '"');
    const parsed = parseTableSource(raw);
    expect(parsed.ok).toBe(true);
    expect(parsed.model.rows).toHaveLength(2);
  });

  test('table content is not corrupted by the math/formatting passes that run after extraction', () => {
    // Cell content here deliberately looks like things other importLaTeX
    // passes react to ($, \textbf, %) to prove table extraction runs first.
    const tex = `\\begin{document}
\\begin{tabular}{ll}
\\hline
Formula & \\textbf{Bold} \\\\
\\hline
$x^2$ & 50\\% \\\\
\\hline
\\end{tabular}
\\end{document}`;
    const html = importLaTeX(tex);
    const match = html.match(/data-table-src="([^"]*)"/);
    const raw = match[1].replace(/&quot;/g, '"');
    expect(raw).toContain('\\textbf{Bold}');
    expect(raw).toContain('$x^2$');
    expect(raw).toContain('50\\%');
    const parsed = parseTableSource(raw);
    expect(parsed.ok).toBe(true);
  });

  test('a table wrapped in a float with a caption imports as one object', () => {
    const tex = `\\begin{document}
\\begin{table}[htbp]
\\centering
\\begin{tabular}{lc}
\\toprule
A & B \\\\
\\bottomrule
\\end{tabular}
\\caption{A caption.}
\\label{tab:x}
\\end{table}
\\end{document}`;
    const html = importLaTeX(tex);
    const matches = html.match(/data-table-src="/g) || [];
    expect(matches).toHaveLength(1); // one object, not one-per-environment
    const raw = html.match(/data-table-src="([^"]*)"/)[1].replace(/&quot;/g, '"');
    const parsed = parseTableSource(raw);
    expect(parsed.ok).toBe(true);
    expect(parsed.model.caption).toBe('A caption.');
    expect(parsed.model.label).toBe('tab:x');
  });
});

import { parseTableSource } from './tableParser';
import { serializeTableModel } from './tableSerializer';

/**
 * Round-trip corpus for the LaTeX table parser/serializer.
 *
 * Provenance note: these samples are hand-authored, modeled closely on
 * well-known real-world conventions (the booktabs package guide, the
 * siunitx package docs, IEEEtran's example tables, and common patterns in
 * ML/stats papers) rather than scraped verbatim from arXiv — this sandbox
 * has no reliable way to pull byte-exact .tex source from arXiv (source is
 * a tarball, not a fetchable page, and the available web-fetch tool
 * summarizes HTML through a model rather than passing text through
 * verbatim, which isn't safe for exact LaTeX syntax). Every sample below is
 * still a realistic table a person would actually write, exercising the
 * exact constructs the task calls out as highest-priority.
 *
 * No LaTeX toolchain (pdflatex/tectonic) is available in this environment,
 * so "still compiles" is checked via a syntactic-balance proxy
 * (assertBalancedLatex) plus structural equivalence against the original,
 * rather than an actual compile — disclosed here rather than overclaimed.
 */

const CORPUS = [
  {
    name: 'simple hline table',
    category: 'simple',
    tex: `\\begin{tabular}{lr}
  Name & Score \\\\
  \\hline
  Alice & 92 \\\\
  Bob & 87 \\\\
\\end{tabular}`,
  },
  {
    name: 'booktabs three-column table',
    category: 'booktabs',
    tex: `\\begin{tabular}{lcc}
  \\toprule
  Method & Accuracy & F1 \\\\
  \\midrule
  Baseline & 0.71 & 0.68 \\\\
  Ours & 0.84 & 0.81 \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'booktabs table wrapped in float with caption/label',
    category: 'booktabs+float',
    tex: `\\begin{table}[htbp]
\\centering
\\begin{tabular}{lcc}
\\toprule
Method & Accuracy & F1 \\\\
\\midrule
Baseline & 0.71 & 0.68 \\\\
Ours & 0.84 & 0.81 \\\\
\\bottomrule
\\end{tabular}
\\caption{Comparison of methods on the test set.}
\\label{tab:results}
\\end{table}`,
  },
  {
    name: 'multirow vertical merge',
    category: 'multirow',
    tex: `\\begin{tabular}{llc}
  \\toprule
  Group & Item & Value \\\\
  \\midrule
  \\multirow{2}{*}{A} & x & 1 \\\\
   & y & 2 \\\\
  \\multirow{2}{*}{B} & x & 3 \\\\
   & y & 4 \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'multicolumn header spanning group columns',
    category: 'multicolumn',
    tex: `\\begin{tabular}{lcc}
  \\toprule
  \\multicolumn{2}{c}{Scores} & Total \\\\
  Reading & Writing & \\\\
  \\midrule
  8 & 7 & 15 \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'multirow and multicolumn combined',
    category: 'multirow+multicolumn',
    tex: `\\begin{tabular}{lccc}
  \\toprule
  \\multirow{2}{*}{Model} & \\multicolumn{2}{c}{Precision} & Recall \\\\
   & Dev & Test & \\\\
  \\midrule
  A & 0.90 & 0.88 & 0.85 \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'siunitx S columns with table-format',
    category: 'siunitx',
    tex: `\\begin{tabular}{l S[table-format=1.2] S[table-format=1.2]}
  \\toprule
  {Method} & {Precision} & {Recall} \\\\
  \\midrule
  Ours & 0.91 & 0.87 \\\\
  Baseline & 0.80 & 0.76 \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'plain S column with no options',
    category: 'siunitx',
    tex: `\\begin{tabular}{lS}
  \\toprule
  Item & {Price} \\\\
  \\midrule
  Widget & 4.50 \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'tabularx with X column',
    category: 'tabularx',
    tex: `\\begin{tabularx}{\\linewidth}{lX}
  \\toprule
  Key & Description \\\\
  \\midrule
  alpha & A long description that should wrap inside the flexible column \\\\
  \\bottomrule
\\end{tabularx}`,
  },
  {
    name: 'IEEEtran-style table',
    category: 'journal-style',
    tex: `\\begin{table}[!t]
\\centering
\\caption{Classification results.}
\\label{tab:ieee}
\\begin{tabular}{lcc}
\\hline
Dataset & Ours & Prior \\\\
\\hline
MNIST & 99.1 & 98.7 \\\\
CIFAR & 91.4 & 89.2 \\\\
\\hline
\\end{tabular}
\\end{table}`,
  },
  {
    name: 'vertical rules in column spec',
    category: 'simple',
    tex: `\\begin{tabular}{|l|c|r|}
  \\hline
  A & B & C \\\\
  \\hline
  1 & 2 & 3 \\\\
  \\hline
\\end{tabular}`,
  },
  {
    name: 'double hline emphasis rule',
    category: 'simple',
    tex: `\\begin{tabular}{ll}
  \\hline
  \\hline
  Key & Value \\\\
  \\hline
  a & 1 \\\\
  \\hline
  \\hline
\\end{tabular}`,
  },
  {
    name: 'p{width} paragraph column',
    category: 'simple',
    tex: `\\begin{tabular}{l p{4cm}}
  \\toprule
  Term & Definition \\\\
  \\midrule
  Recall & Fraction of relevant items retrieved \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'cline partial rule',
    category: 'cline',
    tex: `\\begin{tabular}{lcc}
  \\toprule
  & \\multicolumn{2}{c}{2024} \\\\
  \\cline{2-3}
  Region & Q1 & Q2 \\\\
  \\midrule
  North & 12 & 15 \\\\
  \\bottomrule
\\end{tabular}`,
  },
  {
    name: 'single row no rules',
    category: 'simple',
    tex: `\\begin{tabular}{cc}
  1 & 2 \\\\
\\end{tabular}`,
  },
  {
    name: 'escaped ampersand and percent in cell content',
    category: 'escaping',
    tex: `\\begin{tabular}{lr}
  \\toprule
  Company & Growth \\\\
  \\midrule
  A \\& B Inc. & 12\\% \\\\
  \\bottomrule
\\end{tabular}`,
  },
];

// Intentionally-unsupported constructs: the parser must fail cleanly
// (ok: false) and must not throw, rather than silently mangling them.
const UNSUPPORTED = [
  {
    name: 'repeat column spec *{n}{c}',
    tex: `\\begin{tabular}{l*{3}{c}}
  A & 1 & 2 & 3 \\\\
\\end{tabular}`,
  },
  {
    name: 'array package column modifier >{...}',
    tex: `\\begin{tabular}{>{\\bfseries}l c}
  A & 1 \\\\
\\end{tabular}`,
  },
];

function assertBalancedLatex(str) {
  const opens = (str.match(/\\begin\{[a-zA-Z*]+\}/g) || []).length;
  const closes = (str.match(/\\end\{[a-zA-Z*]+\}/g) || []).length;
  expect(opens).toBe(closes);
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{' && str[i - 1] !== '\\') depth++;
    else if (str[i] === '}' && str[i - 1] !== '\\') depth--;
    expect(depth).toBeGreaterThanOrEqual(0);
  }
  expect(depth).toBe(0);
}

function cellSignature(cell) {
  return `${cell.content.trim()}|${cell.colspan}|${cell.rowspan}`;
}

function assertStructurallyEquivalent(original, reparsed) {
  expect(reparsed.columns.length).toBe(original.columns.length);
  original.columns.forEach((col, ci) => {
    expect(reparsed.columns[ci].align).toBe(col.align);
    if (col.align === 'S') expect(reparsed.columns[ci].sOptions || '').toBe(col.sOptions || '');
  });

  expect(reparsed.rows.length).toBe(original.rows.length);
  original.rows.forEach((row, ri) => {
    expect(reparsed.rows[ri].cells.map(cellSignature)).toEqual(row.cells.map(cellSignature));
  });

  expect(reparsed.rules.length).toBe(original.rules.length);
  original.rules.forEach((tokens, i) => {
    expect([...reparsed.rules[i]].sort()).toEqual([...tokens].sort());
  });

  expect(reparsed.caption || null).toBe(original.caption || null);
  expect(reparsed.label || null).toBe(original.label || null);
}

describe('table round-trip corpus', () => {
  const results = CORPUS.map((sample) => {
    const parsed = parseTableSource(sample.tex);
    if (!parsed.ok) return { ...sample, pass: false, stage: 'parse', error: parsed.error };

    let serialized;
    try {
      serialized = serializeTableModel(parsed.model);
    } catch (e) {
      return { ...sample, pass: false, stage: 'serialize', error: e.message };
    }

    const reparsed = parseTableSource(serialized);
    if (!reparsed.ok) return { ...sample, pass: false, stage: 'reparse', error: reparsed.error };

    try {
      assertBalancedLatex(serialized);
      assertStructurallyEquivalent(parsed.model, reparsed.model);
    } catch (e) {
      return { ...sample, pass: false, stage: 'equivalence', error: e.message };
    }

    return { ...sample, pass: true, serialized };
  });

  test.each(CORPUS.map((s) => [s.name]))('%s round-trips without corruption', (name) => {
    const r = results.find((x) => x.name === name);
    if (!r.pass) {
      throw new Error(`[${r.stage}] ${r.error}`);
    }
    expect(r.pass).toBe(true);
  });

  test('corpus pass rate is at least 90%', () => {
    const passCount = results.filter((r) => r.pass).length;
    const rate = passCount / results.length;

    const byCategory = {};
    results.forEach((r) => {
      byCategory[r.category] = byCategory[r.category] || { pass: 0, total: 0, failures: [] };
      byCategory[r.category].total += 1;
      if (r.pass) byCategory[r.category].pass += 1;
      else byCategory[r.category].failures.push(`${r.name}: [${r.stage}] ${r.error}`);
    });

    // eslint-disable-next-line no-console
    console.log(
      `\nTable corpus pass rate: ${passCount}/${results.length} (${(rate * 100).toFixed(1)}%)\n` +
      Object.entries(byCategory)
        .map(([cat, s]) => `  ${cat}: ${s.pass}/${s.total}` + (s.failures.length ? `\n    FAILED: ${s.failures.join('; ')}` : ''))
        .join('\n')
    );

    expect(rate).toBeGreaterThanOrEqual(0.9);
  });
});

describe('graceful degradation on unsupported constructs', () => {
  test.each(UNSUPPORTED.map((s) => [s.name, s.tex]))('%s falls back cleanly instead of corrupting', (_name, tex) => {
    const parsed = parseTableSource(tex);
    expect(parsed.ok).toBe(false);
    expect(typeof parsed.error).toBe('string');
    expect(parsed.error.length).toBeGreaterThan(0);
  });
});

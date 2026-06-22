// Document templates. Each template applies BOTH page formatting (margins,
// font, columns) and a starter document (title, sections, placeholders).
// Page-settings shapes match DEFAULT_PAGE_SETTINGS in PageSettingsModal.js.

// ── ProseMirror/TipTap JSON builders ──────────────────────────────────────
const text = (t, marks) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });
const bold = (t) => text(t, [{ type: 'bold' }]);
const italic = (t) => text(t, [{ type: 'italic' }]);

const heading = (level, content, attrs = {}) => ({
  type: 'heading',
  attrs: { level, textAlign: 'left', ...attrs },
  content: Array.isArray(content) ? content : [text(content)],
});

const para = (content, attrs = {}) => ({
  type: 'paragraph',
  attrs: { textAlign: 'left', ...attrs },
  content: content == null ? [] : (Array.isArray(content) ? content : [text(content)]),
});

const bullets = (items) => ({
  type: 'bulletList',
  content: items.map((it) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: Array.isArray(it) ? it : [text(it)] }],
  })),
});

// Wrap blocks in the paged-document schema: doc > page > block+
const docOf = (blocks) => ({ type: 'doc', content: [{ type: 'page', content: blocks }] });

// `span` = a block that stretches across both columns (title / author rows).
const SPAN = { columnSpan: true };
const CENTER = { textAlign: 'center' };

const rule = () => ({ type: 'horizontalRule' });

// Justified body filler so two-column templates visibly fill both columns.
const L1 = 'The proposed approach addresses a long-standing challenge in the field by combining established theory with a set of practical optimizations. In this section we describe the motivation in detail and situate our contribution relative to the broader body of work, highlighting the gaps that remain open and the assumptions that prior methods rely upon.';
const L2 = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident.';
const L3 = 'We evaluate the method across several datasets and report consistent improvements over competitive baselines. The experiments are designed to isolate the effect of each component, and an ablation study confirms that every part of the pipeline contributes meaningfully to the final result. Statistical significance is established using paired tests over multiple random seeds.';
const just = (t) => para(t, { textAlign: 'justify' });

// ── Page-setting presets ──────────────────────────────────────────────────
const PS = {
  blank:  { pageSize: 'letter', marginTop: 1,    marginBottom: 1,    marginLeft: 1,    marginRight: 1,    fontSize: 12, lineSpacing: 1.5,  columns: 1 },
  ieee:   { pageSize: 'letter', marginTop: 0.75, marginBottom: 1,    marginLeft: 0.65, marginRight: 0.65, fontSize: 10, lineSpacing: 1,    columns: 2 },
  acm:    { pageSize: 'letter', marginTop: 1,    marginBottom: 1.18, marginLeft: 0.9,  marginRight: 0.9,  fontSize: 9,  lineSpacing: 1.15, columns: 2 },
  thesis: { pageSize: 'letter', marginTop: 1,    marginBottom: 1,    marginLeft: 1.5,  marginRight: 1,    fontSize: 12, lineSpacing: 2,    columns: 1 },
  cv:     { pageSize: 'letter', marginTop: 0.6,  marginBottom: 0.6,  marginLeft: 0.75, marginRight: 0.75, fontSize: 11, lineSpacing: 1.15, columns: 1 },
};

// ── Templates ─────────────────────────────────────────────────────────────
export const TEMPLATES = [
  {
    key: 'blank',
    label: 'Blank Document',
    description: 'A clean single-column page to start from scratch.',
    pageSettings: PS.blank,
    content: docOf([para(null)]),
  },

  {
    key: 'ieee',
    label: 'IEEE Conference',
    description: 'Two-column paper with title block, abstract, and numbered sections.',
    pageSettings: PS.ieee,
    content: docOf([
      heading(1, 'Conference Paper Title', { ...CENTER, ...SPAN }),
      para([text('First A. Author, Second B. Author, and Third C. Author')], { ...CENTER, ...SPAN }),
      para([italic('Dept. of Computer Science, University Name, City, Country')], { ...CENTER, ...SPAN }),
      para([text('{first, second, third}@university.edu')], { ...CENTER, ...SPAN }),
      para([bold('Abstract—'), italic('Summarize the problem, your approach, and the key results in roughly 150–250 words. This single paragraph should stand on its own and convey the essence of the contribution. ' + L2)]),
      para([bold('Index Terms—'), text('keyword one, keyword two, keyword three, keyword four.')]),
      heading(2, 'I. Introduction'),
      just(L1),
      just(L2),
      just('Our contributions are threefold. First, we formulate the problem precisely and identify the conditions under which existing solutions fail. Second, we introduce a method that is both efficient and easy to implement. Third, we provide an extensive empirical evaluation. ' + L3),
      heading(2, 'II. Related Work'),
      just('A substantial body of prior work has studied related problems from a variety of angles. ' + L2),
      just(L3),
      heading(2, 'III. Methodology'),
      just('We now describe our approach in detail. ' + L1),
      just(L2),
      just('The overall procedure is summarized as follows, and each step is designed to be computationally lightweight while preserving the theoretical guarantees discussed above. ' + L3),
      heading(2, 'IV. Experiments and Results'),
      just('We evaluate on standard benchmarks and compare against strong baselines under identical conditions. ' + L3),
      just(L2),
      just('The results indicate that the proposed method generalizes well across domains and remains robust to hyperparameter choices. ' + L1),
      heading(2, 'V. Conclusion'),
      just('We presented a method that advances the state of the art while remaining simple to deploy. ' + L2),
      just('Future work will explore extensions to larger-scale settings and investigate the theoretical limits of the approach. ' + L3),
      heading(2, 'References'),
      para('[1] A. Author, B. Author, "Title of the first paper," Journal Name, vol. 1, no. 1, pp. 1–10, 2024.'),
      para('[2] C. Researcher, "A study of related methods," in Proc. Int. Conf. on Examples, 2023, pp. 100–112.'),
      para('[3] D. Scientist et al., "Foundations of the approach," IEEE Trans. on Topics, vol. 12, pp. 45–67, 2022.'),
      para('[4] E. Engineer, "Practical systems for deployment," ACM Computing Surveys, vol. 5, no. 2, 2021.'),
      para('[5] F. Author, G. Author, "Benchmarks and evaluation," in Proc. Workshop on Methods, 2020, pp. 1–9.'),
    ]),
  },

  {
    key: 'acm',
    label: 'ACM Article',
    description: 'Two-column ACM-style article with concepts, keywords, and sections.',
    pageSettings: PS.acm,
    content: docOf([
      heading(1, 'Article Title', { ...CENTER, ...SPAN }),
      para([text('First Author, Second Author, Third Author')], { ...CENTER, ...SPAN }),
      para([italic('University Name, City, Country')], { ...CENTER, ...SPAN }),
      heading(3, 'Abstract'),
      para('A concise summary of the work: context, contribution, method, and outcome.'),
      heading(3, 'CCS Concepts'),
      para([italic('• Computing methodologies → Your area; • Human-centered computing → Your area.')]),
      heading(3, 'Keywords'),
      para('keyword one, keyword two, keyword three'),
      heading(2, '1  Introduction'),
      para('Introduce the problem, motivation, and contributions of the paper.'),
      heading(2, '2  Background and Related Work'),
      para('Review the relevant literature and position your contribution.'),
      heading(2, '3  Methods'),
      para('Describe your approach, system, or study design.'),
      heading(2, '4  Evaluation'),
      para('Report your experiments, results, and analysis.'),
      heading(2, '5  Conclusion'),
      para('Conclude and describe future directions.'),
      heading(2, 'References'),
      para('Author, A. 2024. Title of the work. In Proceedings of the Conference. ACM, 1–10.'),
    ]),
  },

  {
    key: 'thesis',
    label: 'Thesis / Dissertation',
    description: 'Single-column, double-spaced layout with a title page and chapters.',
    pageSettings: PS.thesis,
    content: docOf([
      heading(1, 'Thesis Title', CENTER),
      para('by', CENTER),
      para([bold('Your Name')], CENTER),
      para('A thesis submitted in partial fulfillment of the requirements for the degree of', CENTER),
      para([bold('Doctor of Philosophy')], CENTER),
      para('Department of … · University Name', CENTER),
      para('Month Year', CENTER),
      heading(1, 'Chapter 1  Introduction'),
      para('Introduce the research problem, objectives, and the structure of the thesis.'),
      heading(2, '1.1  Background'),
      para('Provide the context and background that motivate your research.'),
      heading(2, '1.2  Research Questions'),
      para('State the specific questions this thesis sets out to answer.'),
      heading(1, 'Chapter 2  Literature Review'),
      para('Review, synthesize, and critique relevant prior work.'),
      heading(1, 'Chapter 3  Methodology'),
      para('Describe your research design, data, and methods.'),
      heading(1, 'References'),
      para('Author, A. (2024). Title of the work. Publisher.'),
    ]),
  },

  {
    key: 'cv',
    label: 'CV / Résumé',
    description: 'Compact single-column résumé with sections and bullet points.',
    pageSettings: PS.cv,
    content: docOf([
      heading(1, 'Your Name', CENTER),
      para('City, Country  ·  you@email.com  ·  (000) 000-0000  ·  linkedin.com/in/you', CENTER),
      heading(2, 'Education'),
      rule(),
      para([bold('B.Sc. in Computer Science'), text('  —  University Name, 2021–2025')]),
      bullets(['GPA: 3.9 / 4.0', 'Relevant coursework: Algorithms, Machine Learning, Databases']),
      heading(2, 'Experience'),
      rule(),
      para([bold('Software Engineer Intern'), text('  —  Company Name, Summer 2024')]),
      bullets(['Built X that improved Y by Z%.', 'Collaborated with a team of N engineers on …']),
      heading(2, 'Projects'),
      rule(),
      para([bold('Project Name'), text('  —  one-line description of what it does')]),
      bullets(['Tech stack used and what you accomplished.']),
      heading(2, 'Skills'),
      rule(),
      bullets(['Languages: Python, JavaScript, C++', 'Tools: Git, Docker, React, LaTeX']),
    ]),
  },
];

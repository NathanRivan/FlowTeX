/**
 * Converts a raw LaTeX string into an HTML string that
 * Tiptap’s StarterKit and custom math nodes can parse.
 */
import { expandMacros } from './macroExpander';

// Replaces every `\cmd{...}` (optionally `\cmd*{...}`) with balanced-brace
// matching. A plain non-greedy regex (`\{(.+?)\}`) breaks as soon as the
// argument contains its own braces, e.g. `\section*{\textbf{Intro}}` would
// stop at the first `}` and mangle the rest. Braces preceded by `\` (escaped
// literal braces from exported text) don't count as group delimiters.
function replaceBalanced(str, cmdPattern, render) {
  const re = new RegExp(`\\\\(?:${cmdPattern})\\*?\\{`, 'g');
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = re.exec(str)) !== null) {
    const braceStart = match.index + match[0].length - 1;
    let depth = 1;
    let i = braceStart + 1;
    while (i < str.length && depth > 0) {
      const ch = str[i];
      const prev = str[i - 1];
      if (ch === '{' && prev !== '\\') depth++;
      else if (ch === '}' && prev !== '\\') depth--;
      i++;
    }
    if (depth !== 0) break; // unbalanced — leave the rest untouched
    const inner = str.slice(braceStart + 1, i - 1);
    result += str.slice(lastIndex, match.index) + render(inner);
    lastIndex = i;
    re.lastIndex = i;
  }
  result += str.slice(lastIndex);
  return result;
}

// Converts \colorbox[HTML]{RRGGBB}{...} (as emitted for highlight color by
// latexSerializer) to a <mark> with the same color, so highlighted text
// survives an export/import round trip instead of showing raw LaTeX source.
function replaceColorbox(str) {
  const re = /\\colorbox(?:\[[^\]]*\])?\{([0-9a-fA-F]{6})\}\{/g;
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = re.exec(str)) !== null) {
    const hex = match[1];
    const braceStart = match.index + match[0].length - 1;
    let depth = 1;
    let i = braceStart + 1;
    while (i < str.length && depth > 0) {
      const ch = str[i];
      const prev = str[i - 1];
      if (ch === '{' && prev !== '\\') depth++;
      else if (ch === '}' && prev !== '\\') depth--;
      i++;
    }
    if (depth !== 0) break;
    const inner = str.slice(braceStart + 1, i - 1);
    result += str.slice(lastIndex, match.index) + `<mark data-color="#${hex}" style="background-color:#${hex}">${inner}</mark>`;
    lastIndex = i;
    re.lastIndex = i;
  }
  result += str.slice(lastIndex);
  return result;
}

// Converts \begin{itemize|enumerate}...\end{...} to <ul>/<ol>, innermost
// first, so a nested list's own \item tokens don't leak into the parent
// list's item split. The lookahead in envRe only matches an environment with
// no further nested itemize/enumerate begin inside it (i.e. the innermost
// one currently in the string); each pass peels one layer, converting it to
// plain HTML with no \begin{itemize|enumerate} left, so the next pass finds
// the (former) parent as innermost.
function replaceListEnvs(html) {
  const envRe = /\\begin\{(itemize|enumerate)\}((?:(?!\\begin\{itemize\}|\\begin\{enumerate\})[\s\S])*?)\\end\{\1\}/;
  let prev;
  do {
    prev = html;
    html = html.replace(envRe, (_, env, content) => {
      const items = [];
      const itemRegex = /\\item\b([\s\S]*?)(?=\\item\b|$)/g;
      let m;
      while ((m = itemRegex.exec(content)) !== null) {
        const itemContent = m[1].trim();
        if (itemContent) items.push(`<li>${itemContent}</li>`);
      }
      const tag = env === 'itemize' ? 'ul' : 'ol';
      return `<${tag}>${items.join('')}</${tag}>`;
    });
  } while (html !== prev);
  return html;
}

// Pulls `table`/`table*` floats (that contain a tabular/tabularx) and bare
// tabular/tabularx environments out to sentinel tokens *before* any other
// pass runs, so math/formatting regexes further down don't reach into and
// corrupt raw table source sitting inside what will become an HTML
// attribute value. Sentinels are swapped for the real `data-table-src` divs
// right before paragraph-wrapping, once nothing else will touch the string.
function extractTableEnvs(html) {
  const rawSources = [];
  const sentinel = (i) => ` TABLE${i} `;

  html = html.replace(/\\begin\{(table\*?)\}([\s\S]*?)\\end\{\1\}/g, (full, _env, inner) => {
    if (!/\\begin\{tabularx?\}/.test(inner)) return full; // not a data table float — leave untouched
    const idx = rawSources.push(full) - 1;
    return sentinel(idx);
  });

  html = html.replace(/\\begin\{(tabularx?)\}[\s\S]*?\\end\{\1\}/g, (full) => {
    const idx = rawSources.push(full) - 1;
    return sentinel(idx);
  });

  return { html, rawSources };
}

export function importLaTeX(latex) {
  if (!latex) return '';

  let html = latex;

  // 1. Strip preamble (everything before \begin{document})
  const docMatch = html.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) {
    html = docMatch[1]; // keep only the body
  } else {
    const bodyStart = html.search(/\\(section|chapter|subsection|paragraph)/);
    if (bodyStart > 0) html = html.substring(bodyStart);
  }
  if (window.flumenwriteMacros) {
    html = expandMacros(html, window.flumenwriteMacros);
  }

  // 1b. Pull out tables before anything else can mangle their raw source.
  const { html: withTableSentinels, rawSources: tableSources } = extractTableEnvs(html);
  html = withTableSentinels;

  // 2. Remove comments (lines starting with %)
  html = html.replace(/^\s*%.*$/gm, '');

  // --- MATH CONVERSION (must happen before text manipulation) ---

  // 3. Display math \[ ... \]  → <div data-latex="..."></div>
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) =>
    `<div data-latex="${escapeAttr(math.trim())}"></div>`
  );

  // 4. Display math $$...$$ (if any) → same
  html = html.replace(/\$\$([^$]+?)\$\$/g, (_, math) =>
    `<div data-latex="${escapeAttr(math.trim())}"></div>`
  );

  // 5. Inline math \(...\) → <span data-latex="..."></span>
  html = html.replace(/\\\(([^\\]*?)\\\)/g, (_, math) =>
    `<span data-latex="${escapeAttr(math.trim())}"></span>`
  );

  // 6. Inline math $...$ (not followed by another $) → <span data-latex="..."></span>
  html = html.replace(/\$([^$]+?)\$/g, (_, math) =>
    `<span data-latex="${escapeAttr(math.trim())}"></span>`
  );

  // --- STRUCTURAL CONVERSIONS ---

  // 7. Sections
  html = replaceBalanced(html, 'section', inner => `<h1>${inner}</h1>`);
  html = replaceBalanced(html, 'subsection', inner => `<h2>${inner}</h2>`);
  html = replaceBalanced(html, 'subsubsection', inner => `<h3>${inner}</h3>`);

  // 8. Text formatting
  html = replaceBalanced(html, 'textbf', inner => `<strong>${inner}</strong>`);
  html = replaceBalanced(html, 'textit|emph', inner => `<em>${inner}</em>`);
  html = replaceBalanced(html, 'underline', inner => `<u>${inner}</u>`);
  html = replaceBalanced(html, 'st', inner => `<s>${inner}</s>`);
  html = replaceBalanced(html, 'texttt', inner => `<code>${inner}</code>`);
  html = replaceColorbox(html);
  html = replaceBalanced(html, 'hl', inner => `<mark>${inner}</mark>`);

  // 9. Lists
  html = replaceListEnvs(html);

  // 10. Blockquotes
  html = html.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, '<blockquote>$1</blockquote>');

  // 11. Theorem‑like environments
  const theoremEnvs = ['theorem', 'lemma', 'proof', 'definition', 'corollary', 'proposition'];
  theoremEnvs.forEach(env => {
    // With optional name
    const withName = new RegExp(`\\\\begin\\{${env}\\}\\[([^\\]]*)\\]([\\s\\S]*?)\\\\end\\{${env}\\}`, 'g');
    html = html.replace(withName, (_, opt, content) => {
      let label = '';
      content = content.replace(/\\label\{([^}]+)\}/g, (m, lbl) => {
        label += ` [label: ${lbl}]`;
        return '';
      });
      return `<blockquote><strong>${env}: ${opt}</strong>${label} ${content.trim()}</blockquote>`;
    });

    // Without optional name
    const without = new RegExp(`\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}`, 'g');
    html = html.replace(without, (_, content) => {
      let label = '';
      content = content.replace(/\\label\{([^}]+)\}/g, (m, lbl) => {
        label += ` [label: ${lbl}]`;
        return '';
      });
      return `<blockquote><strong>${env}:</strong>${label} ${content.trim()}</blockquote>`;
    });
  });
  
  // 11b. Abstract environment – keep content with a bold label
  html = html.replace(
    /\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g,
    (_, content) => `<p><strong>Abstract:</strong> ${content.trim()}</p>`
  );

  // 12. Cross‑references that remain outside theorems
  html = html.replace(/\\label\{([^}]+)\}/g, '[label: $1]');
  html = html.replace(/\\ref\{([^}]+)\}/g, '[ref: $1]');
  html = html.replace(/\\cite\{([^}]+)\}/g, '[cite: $1]');

  // 13. Remove common non‑rendering commands (targeted, not a sledgehammer)
  const uselessCommands = [
    'maketitle', 'tableofcontents', 'newpage', 'clearpage', 'cleardoublepage',
    'listoffigures', 'listoftables', 'bibliography', 'bibliographystyle',
    'thispagestyle', 'pagestyle', 'setcounter', 'addtocounter', 'value',
    'appendix', 'noindent', 'indent', 'vspace', 'hspace', 'bigskip', 'medskip', 'smallskip'
  ];
  uselessCommands.forEach(cmd => {
    html = html.replace(new RegExp(`\\\\${cmd}\\b`, 'g'), '');
  });

  // 14. Replace tildes
  html = html.replace(/~/g, ' ');

  // 14b. Swap table sentinels for the real data-table-src divs now that no
  // further pass will reach into (and corrupt) their raw LaTeX content.
  tableSources.forEach((src, idx) => {
    html = html.split(`TABLE${idx}`).join(`<div data-table-src="${escapeAttr(src)}"></div>`);
  });

  // 15. Smart paragraph wrapping (preserves block tags)
  const blocks = html.split(/\n\s*\n/);
  html = blocks
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^\s*<(h[1-6]|ul|ol|blockquote|p|div|table)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  html = html.replace(/<p>\s*<\/p>/g, '');

  // Wrap in a page node so doc > page+ schema is satisfied.
  // The AutoPageBreak plugin will split into multiple pages if content overflows.
  return `<div data-type="page">${html}</div>`;
}

// Helper to escape double quotes inside attribute values
function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}
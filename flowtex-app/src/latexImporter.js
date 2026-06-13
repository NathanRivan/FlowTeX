/**
 * Converts a raw LaTeX string into an HTML string that
 * Tiptap’s StarterKit and custom math nodes can parse.
 */
import { expandMacros } from './macroExpander';
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
  if (window.flowtexMacros) {
    html = expandMacros(html, window.flowtexMacros);
  }

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
  html = html.replace(/\\section\*?\{(.+?)\}/g, '<h1>$1</h1>');
  html = html.replace(/\\subsection\*?\{(.+?)\}/g, '<h2>$1</h2>');
  html = html.replace(/\\subsubsection\*?\{(.+?)\}/g, '<h3>$1</h3>');

  // 8. Text formatting
  html = html.replace(/\\textbf\{(.+?)\}/g, '<strong>$1</strong>');
  html = html.replace(/\\textit\{(.+?)\}/g, '<em>$1</em>');
  html = html.replace(/\\underline\{(.+?)\}/g, '<u>$1</u>');
  html = html.replace(/\\emph\{(.+?)\}/g, '<em>$1</em>');

  // 9. Lists
  html = html.replace(
    /\\begin\{(itemize|enumerate)\}([\s\S]*?)\\end\{\1\}/g,
    (_, env, content) => {
      const items = [];
      const itemRegex = /\\item\b([\s\S]*?)(?=\\item\b|$)/g;
      let match;
      while ((match = itemRegex.exec(content)) !== null) {
        const itemContent = match[1].trim();
        if (itemContent) items.push(`<li>${itemContent}</li>`);
      }
      return `<${env === 'itemize' ? 'ul' : 'ol'}>${items.join('')}</${env === 'itemize' ? 'ul' : 'ol'}>`;
    }
  );

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

  return html;
}

// Helper to escape double quotes inside attribute values
function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}
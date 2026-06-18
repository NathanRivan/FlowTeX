// src/latexSerializer.js

function escapeLaTeX(text) {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function fontsizeToCommand(size) {
  const mapping = {
    '12pt': '\\small',
    '14pt': '\\normalsize',
    '16pt': '\\large',
    '18pt': '\\Large',
    '20pt': '\\LARGE',
    '24pt': '\\huge',
    '30pt': '\\Huge',
  };
  return mapping[size] || '';
}

function fontfamilyToCommand(family) {
  if (!family) return '';
  if (family.includes('sans-serif') || family.includes('Arial')) return '\\textsf';
  if (family.includes('monospace') || family.includes('Courier')) return '\\texttt';
  if (family.includes('serif') || family.includes('Times')) return '\\textrm';
  if (family.includes('Latin Modern')) return ''; // default
  return '';
}

// Process inline content: text with marks, or inline nodes
function renderInline(node) {
  if (node.type === 'text') {
    let text = node.text || '';
    // Escape LaTeX special characters except inside math nodes (handled separately)
    text = escapeLaTeX(text);

    const marks = node.marks || [];
    // Apply marks from inside out
    marks.forEach(mark => {
      switch (mark.type) {
        case 'bold':
          text = `\\textbf{${text}}`;
          break;
        case 'italic':
          text = `\\textit{${text}}`;
          break;
        case 'underline':
          text = `\\underline{${text}}`;
          break;
        case 'strike':
          text = `\\sout{${text}}`; // requires \usepackage{ulem}
          break;
        case 'highlight':
          // Not straightforward; skip or use \hl{} from soul package
          break;
        case 'textStyle':
          // Font size & family
          const fontSize = mark.attrs?.fontSize;
          const fontFamily = mark.attrs?.fontFamily;
          let prefix = '';
          let suffix = '';
          if (fontSize) {
            const sizeCmd = fontsizeToCommand(fontSize);
            if (sizeCmd) {
              prefix = `{${sizeCmd} `;
              suffix = '}';
            }
          }
          if (fontFamily) {
            const famCmd = fontfamilyToCommand(fontFamily);
            if (famCmd) {
              text = `${famCmd}{${text}}`;
            }
          }
          if (prefix) text = `${prefix}${text}${suffix}`;
          break;
        default:
          break;
      }
    });
    return text;
  } else if (node.type === 'katex') {
    return `$${node.attrs?.latex || ''}$`;
  } else if (node.type === 'hardBreak') {
    return '\\\\\n';
  }
  // fallback: just return node text if any
  return '';
}

// Process block nodes recursively
function renderNode(node) {
  switch (node.type) {
    case 'doc':
    case 'page':
      return (node.content || []).map(renderNode).join('\n\n');

    case 'heading': {
      const level = node.attrs?.level || 1;
      const command = level === 1 ? '\\section' : level === 2 ? '\\subsection' : '\\subsubsection';
      const content = (node.content || []).map(renderInline).join('');
      return `${command}{${content}}`;
    }

    case 'paragraph': {
      const alignment = node.attrs?.textAlign;
      const children = (node.content || []).map(renderInline).join('');
      let output = children;
      if (alignment && alignment !== 'left') {
        const env =
          alignment === 'center' ? 'center' :
          alignment === 'right' ? 'flushright' :
          alignment === 'justify' ? 'justify' : null;
        if (env) output = `\\begin{${env}}\n${output}\n\\end{${env}}`;
      }
      return output;
    }

    case 'bulletList':
      return `\\begin{itemize}\n${(node.content || []).map(renderNode).join('\n')}\n\\end{itemize}`;

    case 'orderedList':
      return `\\begin{enumerate}\n${(node.content || []).map(renderNode).join('\n')}\n\\end{enumerate}`;

    case 'listItem':
      return `\\item ${(node.content || []).map(renderInline).join('')}`;

    case 'blockquote':
      return `\\begin{quote}\n${(node.content || []).map(renderNode).join('\n')}\n\\end{quote}`;

    case 'katexDisplay':
      return `\\[${node.attrs?.latex || ''}\\]`;

    // Add more block types as needed (code_block, etc.)
    default:
      // For unknown block types, try to process children
      if (node.content) {
        return node.content.map(renderNode).join('\n');
      }
      return '';
  }
}

export function generateLaTeX(editor) {
  if (!editor) return '';
  const doc = editor.getJSON();
  return renderNode(doc);
}

export function buildFullLaTeX(editor) {
  const body = generateLaTeX(editor);
  return `\\documentclass{article}
\\usepackage{amsmath, amssymb, amsthm, graphicx}
\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}
\\begin{document}
${body}
\\end{document}`;
}
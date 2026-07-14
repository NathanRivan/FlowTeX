import { CITE_COMMANDS, REF_COMMANDS } from './citeRefScan';

// Replaces cross‑reference commands with human‑readable tags for display
export function preprocessMathForDisplay(latex) {
  if (!latex) return '';
// Expand custom macros
  const macros = window.flumenwriteMacros || {};
  let expanded = latex;
  for (const [name, expansion] of Object.entries(macros)) {
    const regex = new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g');
    expanded = expanded.replace(regex, expansion);
  }





  const refRe = new RegExp(`\\\\(?:${REF_COMMANDS.join('|')})\\{([^}]+)\\}`, 'g');
  const citeRe = new RegExp(`\\\\(?:${CITE_COMMANDS.join('|')})\\{([^}]+)\\}`, 'g');

  return expanded
    .replace(/\\label\{([^}]+)\}/g, (_, label) =>
      `\\text{\\small\\color{gray}(label: ${label})}`
    )
    .replace(refRe, (_, ref) =>
      `\\text{\\small\\color{gray}(ref: ${ref})}`
    )
    .replace(citeRe, (_, cite) =>
      `\\text{\\small\\color{gray}(cite: ${cite})}`
    );
}
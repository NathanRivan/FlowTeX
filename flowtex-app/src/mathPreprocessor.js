// Replaces cross‑reference commands with human‑readable tags for display
export function preprocessMathForDisplay(latex) {
  if (!latex) return '';
// Expand custom macros
  const macros = window.flowtexMacros || {};
  let expanded = latex;
  for (const [name, expansion] of Object.entries(macros)) {
    const regex = new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g');
    expanded = expanded.replace(regex, expansion);
  }





  return expanded
    .replace(/\\label\{([^}]+)\}/g, (_, label) =>
      `\\text{\\small\\color{gray}(label: ${label})}`
    )
    .replace(/\\ref\{([^}]+)\}/g, (_, ref) =>
      `\\text{\\small\\color{gray}(ref: ${ref})}`
    )
    .replace(/\\cite\{([^}]+)\}/g, (_, cite) =>
      `\\text{\\small\\color{gray}(cite: ${cite})}`
    );
}
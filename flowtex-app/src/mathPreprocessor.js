// Replaces cross‑reference commands with human‑readable tags for display
export function preprocessMathForDisplay(latex) {
  if (!latex) return '';
  return latex
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
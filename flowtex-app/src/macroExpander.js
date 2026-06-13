// Parse a string of LaTeX definitions and return a dictionary of macro names → replacement text
export function parseMacros(preamble) {
  const macros = {};

  // Helper to find the matching closing brace, given the position of the opening brace
  function getBraceContent(str, openPos) {
    let depth = 1;
    let i = openPos + 1;
    while (i < str.length && depth > 0) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') depth--;
      if (depth > 0) i++;
    }
    return str.substring(openPos + 1, i); // content between braces
  }

  // Match \newcommand{\name}[n]... and capture positions
  const newCommandRegex = /\\newcommand\s*\{\\([a-zA-Z]+)\}\s*(?:\[(\d+)\])?\s*\{/g;
  let match;
  while ((match = newCommandRegex.exec(preamble)) !== null) {
    const name = match[1];
    const args = match[2] ? parseInt(match[2]) : 0;
    const openPos = match.index + match[0].length - 1; // position of the opening brace
    const definition = getBraceContent(preamble, openPos);
    if (args === 0 && definition !== null) {
      macros[name] = definition;
    }
  }

  // Also support \def (simple form) – brace‑count as well
  const defRegex = /\\def\s*\\([a-zA-Z]+)\s*\{/g;
  while ((match = defRegex.exec(preamble)) !== null) {
    const name = match[1];
    const openPos = match.index + match[0].length - 1;
    const definition = getBraceContent(preamble, openPos);
    if (definition !== null) {
      macros[name] = definition;
    }
  }
   // Also support \DeclareMathOperator{\name}{definition}
  const mathOperatorRegex = /\\DeclareMathOperator\s*\*?\s*\{\\([a-zA-Z]+)\}\s*\{/g;
  while ((match = mathOperatorRegex.exec(preamble)) !== null) {
    const name = match[1];
    const openPos = match.index + match[0].length - 1; // position of the opening brace
    const definition = getBraceContent(preamble, openPos);
    if (definition !== null) {
      // Store the macro so that it expands to \operatorname{definition}
      macros[name] = `\\operatorname{${definition}}`;
    }
  }

  return macros;
}
// Apply macros to a string: replace \macro with its expansion
export function expandMacros(latex, macros) {
  let result = latex;
  for (const [name, expansion] of Object.entries(macros)) {
    const regex = new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g');
    result = result.replace(regex, expansion);
  }
  return result;
}
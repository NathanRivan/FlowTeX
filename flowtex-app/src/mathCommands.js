// Shared LaTeX command list used by both the inline autocomplete and the math modal.
// Format: plain string. If it contains '{', the part before '{' is the command name used for filtering.
export const MATH_COMMANDS = [
  // Greek lowercase
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta',
  'theta', 'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi',
  'pi', 'varpi', 'rho', 'varrho', 'sigma', 'varsigma', 'tau', 'upsilon',
  'phi', 'varphi', 'chi', 'psi', 'omega',
  // Greek uppercase
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon',
  'Phi', 'Psi', 'Omega',
  // Structures
  'frac{}{}', 'dfrac{}{}', 'tfrac{}{}',
  'sqrt{}', 'sqrt[n]{}',
  'binom{}{}',
  'overline{}', 'underline{}', 'overbrace{}', 'underbrace{}',
  // Operators
  'sum', 'prod', 'int', 'iint', 'iiint', 'oint',
  'lim', 'limsup', 'liminf', 'sup', 'inf',
  'max', 'min', 'arg', 'det', 'dim', 'gcd',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'log', 'ln', 'lg', 'exp',
  // Decorations
  'vec{}', 'hat{}', 'tilde{}', 'bar{}', 'dot{}', 'ddot{}', 'check{}', 'acute{}', 'grave{}',
  // Fonts
  'mathbb{}', 'mathcal{}', 'mathbf{}', 'mathit{}', 'mathrm{}', 'mathsf{}', 'mathtt{}',
  'text{}', 'textbf{}', 'textit{}',
  // Relations
  'leq', 'geq', 'neq', 'approx', 'equiv', 'propto', 'sim', 'simeq',
  'll', 'gg', 'prec', 'succ', 'preceq', 'succeq',
  'subset', 'supset', 'subseteq', 'supseteq', 'in', 'notin', 'ni',
  'cup', 'cap', 'setminus', 'emptyset', 'varnothing',
  // Arrows
  'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
  'leftrightarrow', 'Leftrightarrow',
  'uparrow', 'downarrow', 'updownarrow',
  'to', 'gets', 'implies', 'iff',
  'mapsto', 'hookrightarrow', 'longrightarrow', 'xrightarrow{}',
  // Logic & misc
  'forall', 'exists', 'nexists', 'neg', 'land', 'lor', 'lnot',
  'therefore', 'because',
  'infty', 'partial', 'nabla', 'square', 'triangle',
  'cdot', 'cdots', 'ldots', 'vdots', 'ddots',
  'times', 'div', 'pm', 'mp', 'oplus', 'otimes', 'odot',
  'perp', 'parallel', 'angle',
  // Delimiters
  'left(', 'right)', 'left[', 'right]', 'left\\{', 'right\\}',
  'langle', 'rangle', 'lfloor', 'rfloor', 'lceil', 'rceil',
  // Environments
  'begin{pmatrix}', 'begin{bmatrix}', 'begin{vmatrix}',
  'begin{cases}', 'begin{align}', 'begin{aligned}',
  // Misc
  'Re', 'Im', 'ell', 'hbar', 'wp', 'aleph',
  'not', 'quad', 'qquad',
];

// Returns the bare command name for filtering (strips template braces).
// e.g. 'frac{}{}' → 'frac', 'begin{pmatrix}' → 'begin'
export function commandName(cmd) {
  const brace = cmd.indexOf('{');
  return brace === -1 ? cmd : cmd.substring(0, brace);
}

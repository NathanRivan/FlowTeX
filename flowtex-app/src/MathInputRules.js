// import { Extension } from '@tiptap/core';
// import { InputRule } from '@tiptap/core';

// export const MathInputRules = Extension.create({
//   name: 'mathInputRules',

//   addInputRules() {
//     return [
//       new InputRule({
//         // Match anything that looks like a dollar‑sign LaTeX expression,
//         // but we’ll manually parse it to avoid regex adjacency bugs.
//         find: /(\$+)([^\$]*?)(\$+)/,
//         handler({ state, range, match, chain }) {
//           const fullText = state.doc.textBetween(range.from, range.to);
//           // fullText is the entire matched text, including dollars.
//           // We'll manually decide if it's display or inline.
//           const openingDollars = match[1];   // the leading $ signs
//           const content = match[2];          // the LaTeX code inside
//           const closingDollars = match[3];   // the trailing $ signs

//           // Helper: insert a node and return the transaction
//           const insertNode = (nodeType, latex) => {
//             const node = state.schema.nodes[nodeType]?.create({ latex });
//             if (!node) return state.tr;
//             return state.tr.replaceRangeWith(range.from, range.to, node);
//           };

//           // Case 1: Display math – exactly two opening and two closing
//           if (openingDollars === '$$' && closingDollars === '$$') {
//             const latex = content.trim();
//             if (latex) {
//               return insertNode('katexDisplay', latex);
//             }
//             return null; // ignore empty display math
//           }

//           // Case 2: Inline math – exactly one opening and one closing,
//           // AND the opening $ is NOT preceded by another $,
//           // AND the closing $ is NOT followed by another $.
//           if (openingDollars === '$' && closingDollars === '$') {
//             const charBefore = range.from > 0
//               ? state.doc.textBetween(range.from - 1, range.from)
//               : '';
//             const charAfter = range.to < state.doc.content.size
//               ? state.doc.textBetween(range.to, range.to + 1)
//               : '';

//             if (charBefore === '$' || charAfter === '$') {
//               return null; // part of a larger `$$…$$`, skip
//             }
//             const latex = content.trim();
//             if (latex) {
//               return insertNode('katex', latex);
//             }
//             return null;
//           }

//           // Case 3: Any other combination (e.g., $$$, $ with no closing, etc.) – ignore
//           return null;
//         },
//       }),
//     ];
//   },
// });
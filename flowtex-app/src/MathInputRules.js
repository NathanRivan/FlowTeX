import { Extension } from '@tiptap/core';
import { InputRule } from '@tiptap/core';

export const MathInputRules = Extension.create({
  name: 'mathInputRules',

  addInputRules() {
    return [
      // Display math first: $$...$$ → block node
      new InputRule({
        find: /\$\$([^$]+?)\$\$/,
        handler({ state, range, match }) {
          const latex = match[1].trim();
          if (!latex) return null;
          const katexDisplayNode = state.schema.nodes.katexDisplay?.create({ latex });
          if (!katexDisplayNode) return null;
          return state.tr.replaceRangeWith(range.from, range.to, katexDisplayNode);
        },
      }),

      // Inline math: $...$ → inline node (no adjacent $)
      new InputRule({
        find: /(?<!\$)\$(?!\$)([^$]+?)(?<!\$)\$(?!\$)/,
        handler({ state, range, match }) {
          const latex = match[1].trim();
          if (!latex) return null;
          const katexNode = state.schema.nodes.katex?.create({ latex });
          if (!katexNode) return null;
          return state.tr.replaceRangeWith(range.from, range.to, katexNode);
        },
      }),
    ];
  },
});
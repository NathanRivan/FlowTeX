import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export const MathInputPlugin = Extension.create({
  name: 'mathInputPlugin',

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('mathInputHandler');

    // Helper: given a position, find the entire $...$ or $$...$$ pattern around it
    function findMathRange(state, pos) {
      const { doc } = state;
      const $pos = doc.resolve(pos);
      const block = $pos.node();

      if (!block || !block.isTextblock) return null;

      const blockStart = $pos.start();
      const blockEnd = $pos.end();
      const blockText = state.doc.textBetween(blockStart, blockEnd, '\n', '\ufffc');
      const cursorOffset = pos - blockStart;

      // Single robust regex to match both display and inline math
      const regex = /(\$\$([^$]*?)\$\$)|(?<!\$)\$([^$]+?)\$(?!\$)/g;
      let match;
      while ((match = regex.exec(blockText)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        // Check if cursor is inside this match (including right after the match end)
        if (cursorOffset >= matchStart && cursorOffset <= matchEnd) {
          // Determine type
          const display = !!match[1];
          const latex = (display ? match[2] : match[3]).trim();
          if (!latex) continue;
          const from = blockStart + matchStart;
          const to = blockStart + matchEnd;
          return { from, to, latex, display };
        }
      }
      return null;
    }

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            input: (view, event) => {
              // Only act if the input event added a '$'
              const inputType = event.inputType;
              if (inputType !== 'insertText' || event.data !== '$') return false;

              // Wait for the editor state to be updated
              requestAnimationFrame(() => {
                const { state, dispatch } = view;
                const pos = state.selection.head;
                const range = findMathRange(state, pos);
                if (!range) return;

                const { from, to, latex, display } = range;
                const nodeType = display ? 'katexDisplay' : 'katex';
                const node = state.schema.nodes[nodeType]?.create({ latex });
                if (!node) return;
                const tr = state.tr.replaceWith(from, to, node);
                dispatch(tr);
              });

              return false;
            },
          },
        },
      }),
    ];
  },
});
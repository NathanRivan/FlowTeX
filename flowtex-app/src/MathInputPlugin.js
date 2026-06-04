import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export const MathInputPlugin = Extension.create({
  name: 'mathInputPlugin',

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('mathInputHandler');
    let converting = false;

    function findMathRange(state, pos) {
      const { doc } = state;
      const $pos = doc.resolve(pos);
      const block = $pos.node();
      if (!block || !block.isTextblock) return null;

      const blockStart = $pos.start();
      const blockEnd = $pos.end();
      const blockText = state.doc.textBetween(blockStart, blockEnd, '\n', '\ufffc');
      const cursorOffset = pos - blockStart;

      const regex = /(\$\$([^$]*?)\$\$)|(?<!\$)\$([^$]+?)\$(?!\$)/g;
      let match;
      while ((match = regex.exec(blockText)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        if (cursorOffset >= matchStart && cursorOffset <= matchEnd) {
          const display = !!match[1];
          const latex = (display ? match[2] : match[3]).trim();
          if (!latex) continue;
          return {
            from: blockStart + matchStart,
            to: blockStart + matchEnd,
            latex,
            display,
          };
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
              if (converting) return false;
              if (event.inputType !== 'insertText' || event.data !== '$') return false;

              converting = true;
              requestAnimationFrame(() => {
                const { state, dispatch } = view;
                const pos = state.selection.head;
                const range = findMathRange(state, pos);
                if (range) {
                  const { from, to, latex, display } = range;
                  const nodeType = display ? 'katexDisplay' : 'katex';
                  const node = state.schema.nodes[nodeType]?.create({ latex });
                  if (node) {
                    const tr = state.tr.replaceWith(from, to, node);
                    dispatch(tr);
                  }
                }
                converting = false;
              });
              return false;
            },
            keydown: (view, event) => {
              // Only intercept space when the cursor is right after a math node
              if (event.key === ' ') {
                const { state, dispatch } = view;
                const { selection } = state;
                // Check if the position right before the cursor is a math node
                const $pos = state.doc.resolve(selection.head);
                const nodeBefore = $pos.nodeBefore;
                if (nodeBefore && (nodeBefore.type.name === 'katex' || nodeBefore.type.name === 'katexDisplay')) {
                  event.preventDefault();
                  // Insert a space character safely
                  const tr = state.tr.insertText(' ', selection.head);
                  dispatch(tr);
                  return true; // prevent default
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
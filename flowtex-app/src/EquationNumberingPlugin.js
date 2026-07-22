import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const pluginKey = new PluginKey('equationNumbering');

// Numbers are never stored on the node — they're derived from document order
// among numbered katexDisplay nodes every time decorations are read, so
// inserting/deleting/reordering equations never needs manual renumbering.
function buildDecorations(doc) {
  const decorations = [];
  let n = 0;
  doc.descendants((node, pos) => {
    if (node.type.name === 'katexDisplay' && node.attrs.numbered) {
      n += 1;
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { 'data-eq-number': String(n) }));
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const EquationNumberingPlugin = Extension.create({
  name: 'equationNumbering',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            return buildDecorations(state.doc);
          },
        },
      }),
    ];
  },
});

import { Extension } from '@tiptap/core';

export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      maxLevel: 8,
      minLevel: 0,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => parseInt(element.getAttribute('data-indent')) || 0,
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent === 0) return {};
              return { 'data-indent': attributes.indent };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const $pos = state.doc.resolve(selection.head);
          const node = $pos.node();
          const currentIndent = node.attrs?.indent || 0;
          const newIndent = Math.min(currentIndent + 1, this.options.maxLevel);
          return chain().updateAttributes(node.type.name, { indent: newIndent }).run();
        },
      outdent:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const $pos = state.doc.resolve(selection.head);
          const node = $pos.node();
          const currentIndent = node.attrs?.indent || 0;
          const newIndent = Math.max(currentIndent - 1, this.options.minLevel);
          return chain().updateAttributes(node.type.name, { indent: newIndent }).run();
        },
    };
  },
});
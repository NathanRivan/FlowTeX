import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      maxLevel: 8,
      minLevel: 0,
      step: 1.5,         // em per indent level
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const val = parseInt(element.getAttribute('data-indent'));
              return isNaN(val) ? 0 : val;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent === 0) {
                return {};
              }
              return {
                'data-indent': attributes.indent,
                style: `margin-left: ${attributes.indent * this.options.step}em;`,
              };
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
          const current = node.attrs?.indent || 0;
          const newIndent = Math.min(current + 1, this.options.maxLevel);
          return chain()
            .updateAttributes(node.type.name, { indent: newIndent })
            .run();
        },
      outdent:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const $pos = state.doc.resolve(selection.head);
          const node = $pos.node();
          const current = node.attrs?.indent || 0;
          const newIndent = Math.max(current - 1, this.options.minLevel);
          return chain()
            .updateAttributes(node.type.name, { indent: newIndent })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    // Keep the DOM style in sync even when the attribute is changed
    return [
      new Plugin({
        key: new PluginKey('indentStyleSync'),
        view: (view) => ({
          update: (view, prevState) => {
            // When the document changes, check each paragraph/heading
            view.state.doc.descendants((node, pos) => {
              if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                const indent = node.attrs.indent || 0;
                const dom = view.nodeDOM(pos);
                if (dom) {
                  const currentMargin = dom.style.marginLeft;
                  const expected = indent > 0 ? `${indent * this.options.step}em` : '';
                  if (currentMargin !== expected) {
                    dom.style.marginLeft = expected;
                  }
                }
              }
            });
          },
        }),
      }),
    ];
  },
});
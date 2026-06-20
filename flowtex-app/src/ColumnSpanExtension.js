import { Extension } from '@tiptap/core';

// Adds a `columnSpan` boolean attribute to common block nodes.
// When true, renders `style="column-span: all"` so the block stretches
// across both columns in a two-column layout.
export const ColumnSpan = Extension.create({
  name: 'columnSpan',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList'],
        attributes: {
          columnSpan: {
            default: false,
            parseHTML: el => el.getAttribute('data-col-span') === 'all',
            renderHTML: attrs =>
              attrs.columnSpan
                ? { 'data-col-span': 'all', style: 'column-span: all; width: 100%;' }
                : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleColumnSpan:
        () =>
        ({ editor, chain }) => {
          const BLOCK_TYPES = ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList'];
          const activeType = BLOCK_TYPES.find(t => editor.isActive(t));
          if (!activeType) return false;
          const current = editor.getAttributes(activeType).columnSpan ?? false;
          return chain().focus().updateAttributes(activeType, { columnSpan: !current }).run();
        },
    };
  },
});

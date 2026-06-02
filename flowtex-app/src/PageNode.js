import { Node } from '@tiptap/core';

export const PageNode = Node.create({
  name: 'page',
  group: 'block',
  content: 'block+',      // at least one block inside each page
  isolating: true,
  selectable: false,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div.page-container' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'page-container', ...HTMLAttributes }, 0];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.classList.add('page-sheet');
      return {
        dom,
        contentDOM: dom,   // child blocks are rendered inside this element
      };
    };
  },
});
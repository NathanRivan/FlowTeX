import { Node } from '@tiptap/core';

export const PageNode = Node.create({
  name: 'page',
  // No group: page nodes only appear as direct children of doc
  content: 'block+',
  isolating: false, // allow cursor to flow between pages naturally
  selectable: false,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-type="page"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'page', ...HTMLAttributes }, 0];
  },

  addNodeView() {
    return () => {
      const dom = document.createElement('div');
      dom.className = 'page-node';

      const contentDOM = document.createElement('div');
      contentDOM.className = 'page-content';
      dom.appendChild(contentDOM);

      return { dom, contentDOM };
    };
  },
});

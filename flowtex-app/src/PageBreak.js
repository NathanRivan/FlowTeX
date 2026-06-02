import { Node } from '@tiptap/core';

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      break: {
        default: 'page',
        renderHTML: attrs => ({ 'data-break': attrs.break }),
        parseHTML: element => element.getAttribute('data-break'),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'hr[data-break="page"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', { 'data-break': 'page', ...HTMLAttributes }];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.classList.add('page-break');
      dom.setAttribute('data-break', 'page');
      dom.innerHTML = '<div class="page-break-line"></div><span class="page-break-label">Page Break</span>';
      return { dom };
    };
  },

  addCommands() {
    return {
      insertPageBreak: () => ({ commands }) => {
        return commands.insertContent({ type: 'pageBreak' });
      },
    };
  },
});
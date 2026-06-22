import { Node } from '@tiptap/core';
import { TextSelection } from 'prosemirror-state';

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
      insertNewPage: () => ({ state, dispatch }) => {
        const { doc, schema, selection } = state;
        let pageEnd = null;
        doc.forEach((node, offset) => {
          if (node.type.name !== 'page') return;
          if (selection.from >= offset + 1 && selection.from <= offset + node.nodeSize - 1) {
            pageEnd = offset + node.nodeSize;
          }
        });
        if (pageEnd === null) return false;
        const newPage = schema.nodes.page.create({}, [schema.nodes.paragraph.create()]);
        const tr = state.tr.insert(pageEnd, newPage);
        // pageEnd + 1 = page open token, + 2 = paragraph open token → first text position
        tr.setSelection(TextSelection.create(tr.doc, pageEnd + 2));
        // Tell the pagination plugin to skip empty-page cleanup this cycle so
        // the page we just came from isn't removed before the user can type in it.
        tr.setMeta('skipEmptyCleanup', true);
        tr.scrollIntoView();
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },
});
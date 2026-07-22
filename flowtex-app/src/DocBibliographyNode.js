import { Node, mergeAttributes } from '@tiptap/core';
import { formatBibliographyEntry, sortReferences } from './citationFormat';
import { onValidationChange } from './validationBus';

// Renders no ProseMirror content of its own: the reference list is derived
// fresh from the live document + reference library on every relevant change
// (same "never store what's derivable" approach EquationNumberingPlugin uses
// for equation numbers), so adding/removing a citation anywhere in the doc
// never needs a manual resync of this node's own content.
function collectCitedRefIds(doc) {
  const ids = new Set();
  doc.descendants(node => {
    if (node.type.name === 'citation') {
      (node.attrs.refIds || []).forEach(id => ids.add(id));
    }
  });
  return ids;
}

export const DocBibliographyNode = Node.create({
  name: 'docBibliography',
  group: 'block',
  atom: true,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-type="doc-bibliography"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'doc-bibliography', class: 'doc-bibliography' })];
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('div');
      dom.className = 'doc-bibliography';

      const render = () => {
        const library = window.flumenwriteReferenceLibrary || new Map();
        const citedIds = collectCitedRefIds(editor.state.doc);
        const refs = sortReferences([...citedIds].map(id => library.get(id)).filter(Boolean));
        dom.innerHTML = '';
        if (!refs.length) {
          const empty = document.createElement('p');
          empty.className = 'doc-bibliography-empty';
          empty.textContent = 'No citations yet — insert one from the References panel.';
          dom.appendChild(empty);
          return;
        }
        refs.forEach(ref => {
          const entry = document.createElement('p');
          entry.className = 'doc-bibliography-entry';
          entry.textContent = formatBibliographyEntry(ref);
          dom.appendChild(entry);
        });
      };

      render();
      // Citations elsewhere in the doc don't touch this node, so ProseMirror
      // never calls update() on it for them — listen to the editor directly.
      const onDocUpdate = () => render();
      editor.on('update', onDocUpdate);
      const unsubscribe = onValidationChange(render);

      return {
        dom,
        update: (updatedNode) => updatedNode.type.name === 'docBibliography',
        ignoreMutation: () => true,
        destroy: () => { editor.off('update', onDocUpdate); unsubscribe(); },
      };
    };
  },

  addCommands() {
    return {
      insertDocBibliography: () => ({ commands }) => commands.insertContent({ type: this.name }),
    };
  },
});

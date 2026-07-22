import { Node, mergeAttributes } from '@tiptap/core';
import { formatCitation } from './citationFormat';
import { onValidationChange } from './validationBus';

// An inline citation only stores the reference ids it points at (plus a
// style tag) — never the resolved author/year text, so renaming an author
// in the library updates every citation everywhere instead of going stale.
// Display text is resolved at render time from window.flumenwriteReferenceLibrary
// (populated by useReferenceLibrary.js), the same window-global handoff the
// app already uses for the .bib source (window.flumenwriteBibliography) and
// macros (window.flumenwriteMacros).
export const CitationExtension = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      refIds: {
        default: [],
        parseHTML: element => {
          try { return JSON.parse(element.getAttribute('data-ref-ids') || '[]'); }
          catch { return []; }
        },
        renderHTML: attributes => ({ 'data-ref-ids': JSON.stringify(attributes.refIds || []) }),
      },
      style: {
        default: 'apa',
        parseHTML: element => element.getAttribute('data-style') || 'apa',
        renderHTML: attributes => ({ 'data-style': attributes.style || 'apa' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-ref-ids]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'citation-inline' })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'citation-inline';
      dom.title = 'Click to locate in References';

      const render = () => {
        const library = window.flumenwriteReferenceLibrary || new Map();
        const refs = (node.attrs.refIds || []).map(id => library.get(id)).filter(Boolean);
        dom.textContent = refs.length ? formatCitation(refs, node.attrs.style) : '(missing reference)';
        dom.classList.toggle('citation-missing', refs.length === 0);
      };

      render();
      const unsubscribe = onValidationChange(render);

      dom.addEventListener('click', (e) => {
        e.stopPropagation();
        window.flumenwriteCitationClick?.(node.attrs.refIds || []);
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node.attrs = { ...updatedNode.attrs };
          render();
          return true;
        },
        destroy: unsubscribe,
      };
    };
  },

  addCommands() {
    return {
      insertCitation: (refIds, style = 'apa') => ({ commands }) => {
        if (!refIds || !refIds.length) return false;
        return commands.insertContent({ type: this.name, attrs: { refIds, style } });
      },
    };
  },
});

import { Node } from '@tiptap/core';
import katex from 'katex';

export const KatexExtension = Node.create({
  name: 'katex',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
      display: {
        default: false,
        parseHTML: element => element.getAttribute('data-display') === 'true',
        renderHTML: attributes => ({ 'data-display': attributes.display }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-latex]',
        getAttrs: (dom) => ({ latex: dom.getAttribute('data-latex') }),
      },
    ];
  },

  // NEW: tell the serializer how to output this node as HTML
  renderHTML({ node, HTMLAttributes }) {
    const latex = node.attrs.latex || '';
    return ['span', { 'data-latex': latex, ...HTMLAttributes }, latex];
  },

  addNodeView() {
    return (props) => {
      const { node, getPos } = props;
      const dom = document.createElement('span');
      dom.setAttribute('data-latex', node.attrs.latex);
      dom.classList.add('katex-inline');
      dom.setAttribute('title', 'Click to edit math');

      const render = (attrs) => {
        try {
          dom.innerHTML = katex.renderToString(attrs.latex, {
            throwOnError: false,
            displayMode: attrs.display,
          });
        } catch (e) {
          dom.innerHTML = `<span style="color:red;">${attrs.latex}</span>`;
        }
      };

      render(node.attrs);

      // ----- RELIABLE CLICK HANDLER -----
      dom.addEventListener('click', (e) => {
        // Make sure we have a valid position and the global callback exists
        const pos = getPos?.();
        if (pos !== undefined && window.flowtexMathEdit) {
          e.stopPropagation();   // prevent ProseMirror from doing its own selection
          window.flowtexMathEdit(pos, node.attrs.latex, false);
        }
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node.attrs = { ...updatedNode.attrs };
          dom.setAttribute('data-latex', node.attrs.latex);
          render(node.attrs);
          return true;
        },
      };
    };
  },


  addCommands() {
    return {
      insertKatex:
        (latex) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'katex',
            attrs: { latex },
          });
        },
    };
  },
});
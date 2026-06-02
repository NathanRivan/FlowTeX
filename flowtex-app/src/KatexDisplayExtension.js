import { Node } from '@tiptap/core';
import katex from 'katex';

export const KatexDisplayExtension = Node.create({
  name: 'katexDisplay',
  group: 'block',
  inline: false,
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
      display: {
        default: true,
        parseHTML: element => element.getAttribute('data-display') === 'true',
        renderHTML: attributes => ({ 'data-display': attributes.display }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-latex]',
        getAttrs: (dom) => ({ latex: dom.getAttribute('data-latex') }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const latex = node.attrs.latex || '';
    return ['div', { 'data-latex': latex, ...HTMLAttributes }, latex];
  },

  addNodeView() {
    return (props) => {
      const { node, getPos } = props;
      const dom = document.createElement('div');
      dom.setAttribute('data-latex', node.attrs.latex);
      dom.classList.add('katex-display-node');
      dom.setAttribute('title', 'Click to edit math');

      const render = (attrs) => {
        try {
          dom.innerHTML = katex.renderToString(attrs.latex, {
            throwOnError: false,
            displayMode: true,
          });
        } catch (e) {
          dom.innerHTML = `<span style="color:red;">${attrs.latex}</span>`;
        }
      };

      render(node.attrs);

      dom.addEventListener('click', (e) => {
        const pos = getPos?.();
        if (pos !== undefined && window.flowtexMathEdit) {
          e.stopPropagation();
          window.flowtexMathEdit(pos, node.attrs.latex, true);
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
      insertKatexDisplay:
        (latex) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'katexDisplay',
            attrs: { latex },
          });
        },
    };
  },
});
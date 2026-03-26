import { Node } from '@tiptap/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const KatexExtension = Node.create({
  name: 'katex',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: '' },
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

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      dom.setAttribute('data-latex', node.attrs.latex);
      dom.classList.add('katex-inline');
      
      const update = () => {
        try {
          const html = katex.renderToString(node.attrs.latex, { throwOnError: false });
          dom.innerHTML = html;
        } catch (e) {
          dom.innerHTML = `<span style="color:red;">${node.attrs.latex}</span>`;
        }
      };
      
      update();
      
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node.attrs.latex = updatedNode.attrs.latex;
          update();
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
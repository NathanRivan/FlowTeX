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
    const latex = node.attrs.latex;
    const displayMode = node.attrs.display;
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
      });
      return ['span', { 'data-latex': latex, ...HTMLAttributes }, { dangerouslySetInnerHTML: { __html: html } }];
    } catch (e) {
      return ['span', { 'data-latex': latex, ...HTMLAttributes }, latex];
    }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.setAttribute('data-latex', node.attrs.latex);
      dom.classList.add(node.attrs.display ? 'katex-display' : 'katex-inline');

      const render = (attrs) => {
        try {
          const html = katex.renderToString(attrs.latex, {
            throwOnError: false,
            displayMode: attrs.display,
          });
          dom.innerHTML = html;
        } catch (e) {
          dom.innerHTML = `<span style="color:red;">${attrs.latex}</span>`;
        }
      };

      render(node.attrs);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node.attrs = { ...updatedNode.attrs };
          dom.setAttribute('data-latex', node.attrs.latex);
          dom.className = node.attrs.display ? 'katex-display' : 'katex-inline';
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
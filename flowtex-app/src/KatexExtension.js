import { Node } from '@tiptap/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { preprocessMathForDisplay } from './mathPreprocessor';

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

  renderHTML({ node, HTMLAttributes }) {
    const latex = node.attrs.latex || '';
    const processed = preprocessMathForDisplay(latex);
    try {
      const html = katex.renderToString(processed, {
        throwOnError: false,
        displayMode: false,
      });
      return ['span', { 'data-latex': latex, ...HTMLAttributes }, { _: 'html', value: html }];
    } catch (e) {
      return ['span', { 'data-latex': latex, ...HTMLAttributes }, latex];
    }
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
          const html = katex.renderToString(
            preprocessMathForDisplay(attrs.latex),
            { throwOnError: false, displayMode: attrs.display }
          );
          dom.innerHTML = html;
        } catch (e) {
          dom.innerHTML = `<span style="color:red;">${attrs.latex}</span>`;
        }
      };

      render(node.attrs);

      dom.addEventListener('click', (e) => {
        const pos = getPos?.();
        if (pos !== undefined && window.flowtexMathEdit) {
          e.stopPropagation();
          window.flowtexMathEdit(pos, node.attrs.latex, false);
        }
      });

      const triggerAnimation = (dom) => {
        dom.style.animation = 'none';
        void dom.offsetHeight;
        dom.style.animation = '';
      };

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node.attrs = { ...updatedNode.attrs };
          dom.setAttribute('data-latex', node.attrs.latex);
          render(node.attrs);
          dom.style.animation = 'none';
          void dom.offsetHeight;
          dom.style.animation = '';
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
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
          const html = katex.renderToString(
            preprocessMathForDisplay(attrs.latex),
            { throwOnError: false, displayMode: attrs.display }
          );
          dom.innerHTML = html;
        } catch (e) {
          dom.innerHTML = `<span style="color:red;">${attrs.latex}</span>`;
        }
        // Check if there's a red error span (KaTeX error)
        const errorSpan = dom.querySelector('.katex-error');
        if (errorSpan) {
          // Remove any previous error icon
          const existingIcon = dom.querySelector('.katex-error-icon');
          if (!existingIcon) {
            const icon = document.createElement('span');
            icon.className = 'katex-error-icon';
            icon.innerHTML = '⚠️';
            icon.title = errorSpan.textContent || 'Unknown command';
            icon.style.cssText = 'cursor:help; margin-left:4px; font-size:0.9em;';
            dom.appendChild(icon);
          }
        } else {
          // Remove error icon if present
          const icon = dom.querySelector('.katex-error-icon');
          if (icon) icon.remove();
        }
      };

      render(node.attrs);

      dom.addEventListener('click', (e) => {
        const pos = getPos?.();
        if (pos !== undefined && window.flumenwriteMathEdit) {
          e.stopPropagation();
          // Pass getPos as a function, along with initial latex and isDisplay flag
          window.flumenwriteMathEdit(() => getPos(), node.attrs.latex, false);
        }
      });


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
import { Node } from '@tiptap/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { preprocessMathForDisplay } from './mathPreprocessor';
import { computeEquationMarker, dismissWarning } from './equationValidation';
import { onValidationChange } from './validationBus';

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
            { throwOnError: false, strict: false, displayMode: attrs.display }
          );
          dom.innerHTML = html;
        } catch (e) {
          dom.innerHTML = `<span style="color:red;">${attrs.latex}</span>`;
        }

        const existingIcon = dom.querySelector('.katex-error-icon');
        if (existingIcon) existingIcon.remove();
        dom.classList.remove('katex-has-error', 'katex-has-warning');

        const marker = computeEquationMarker(attrs.latex);
        if (marker) {
          dom.classList.add(marker.severity === 'warning' ? 'katex-has-warning' : 'katex-has-error');
          const icon = document.createElement('span');
          icon.className = `katex-error-icon katex-error-icon--${marker.severity}`;
          icon.textContent = marker.severity === 'warning' ? '!' : '⚠';
          icon.title = marker.dismissKey
            ? `${marker.message}\n(click to dismiss)`
            : marker.message;
          if (marker.dismissKey) {
            icon.addEventListener('click', (e) => {
              e.stopPropagation();
              dismissWarning(marker.dismissKey);
              render(attrs);
            });
          }
          dom.appendChild(icon);
        }
      };

      render(node.attrs);
      const unsubscribeValidation = onValidationChange(() => render(node.attrs));

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
        destroy: () => {
          unsubscribeValidation();
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
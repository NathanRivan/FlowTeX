import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { scanCitations, scanRefs, scanLabels } from './citeRefScan';
import { parseBibKeys } from './bibParser';
import { notifyValidationChange } from './validationBus';

// Full-document rescans are cheap (linear regex passes over text) but are
// debounced anyway per the "must feel instant, not like a compile step"
// requirement, so a fast typist / a large paste doesn't pay the walk cost on
// every single keystroke.
const DEBOUNCE_MS = 150;

const pluginKey = new PluginKey('citeRefValidation');

// Walks the whole doc once, collecting every place raw LaTeX text can live:
// plain text runs, and the `latex`/`raw` attrs of the equation/table atom
// nodes (the only other places unescaped LaTeX commands survive in this
// editor — see latexSerializer.js's escapeLaTeX for plain text).
function collectTextChunks(doc) {
  const chunks = [];
  doc.descendants((node, pos) => {
    if (node.isText) {
      chunks.push({ text: node.text, pos, isAtom: false });
    } else if (node.type.name === 'katex' || node.type.name === 'katexDisplay') {
      chunks.push({ text: node.attrs.latex || '', pos, isAtom: true });
    } else if (node.type.name === 'latexTable') {
      chunks.push({ text: node.attrs.raw || '', pos, isAtom: true });
    }
  });
  return chunks;
}

function buildValidation(doc) {
  const chunks = collectTextChunks(doc);

  const labelDefs = new Set();
  chunks.forEach(({ text }) => {
    scanLabels(text).forEach(({ label }) => labelDefs.add(label));
  });

  const bibKeys = parseBibKeys(window.flumenwriteBibliography || '');

  const decorations = [];
  chunks.forEach(({ text, pos, isAtom }) => {
    if (isAtom) return; // equation/table node views mark themselves — see katexValidate usage in those extensions

    scanCitations(text).forEach(({ keys, start, end }) => {
      const missing = keys.filter((k) => !bibKeys.has(k));
      if (!missing.length) return;
      const message = `no matching entry in bibliography for ${missing.join(', ')}`;
      decorations.push(Decoration.inline(pos + start, pos + end, {
        class: 'citeref-error',
        title: message,
      }));
    });

    scanRefs(text).forEach(({ label, start, end }) => {
      if (!label || labelDefs.has(label)) return;
      decorations.push(Decoration.inline(pos + start, pos + end, {
        class: 'citeref-error',
        title: `no matching \\label for "${label}"`,
      }));
    });
  });

  window.flumenwriteLabelDefs = labelDefs;
  window.flumenwriteBibKeys = bibKeys;

  return DecorationSet.create(doc, decorations);
}

export const CiteRefValidationPlugin = Extension.create({
  name: 'citeRefValidation',

  addProseMirrorPlugins() {
    let debounceTimer = null;

    return [
      new Plugin({
        key: pluginKey,

        state: {
          init(_, state) {
            return buildValidation(state.doc);
          },
          apply(tr, prev, _oldState, newState) {
            const forced = tr.getMeta(pluginKey);
            if (forced) return forced;
            if (!tr.docChanged) return prev;
            // Keep existing markers positionally correct immediately; the
            // debounced full rescan below replaces them once typing settles.
            return prev.map(tr.mapping, newState.doc);
          },
        },

        props: {
          decorations(state) {
            return pluginKey.getState(state);
          },
        },

        view(editorView) {
          const rescan = () => {
            if (editorView.isDestroyed) return;
            const decorations = buildValidation(editorView.state.doc);
            editorView.dispatch(editorView.state.tr.setMeta(pluginKey, decorations));
            notifyValidationChange();
          };
          // Exposed so Editor.js can force an immediate re-check when the
          // .bib source is edited/saved, not just when the doc itself changes.
          window.flumenwriteRevalidateCiteRefs = rescan;

          return {
            update(view, prevState) {
              if (view.state.doc === prevState.doc) return;
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(rescan, DEBOUNCE_MS);
            },
            destroy() {
              clearTimeout(debounceTimer);
              delete window.flumenwriteRevalidateCiteRefs;
            },
          };
        },
      }),
    ];
  },
});

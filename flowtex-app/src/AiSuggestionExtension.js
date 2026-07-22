import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Renders a proposed AI edit as a non-mutating overlay (decorations only —
// the real document is untouched until acceptAiSuggestion runs) so it reads
// as a reviewable diff: strikethrough over the scoped range, plus the
// proposed replacement text inserted right after in an "added" style.
// Mirrors CiteRefValidationPlugin.js's plugin-state-with-meta pattern.

export const aiSuggestionPluginKey = new PluginKey('aiSuggestion');

function buildDecorations(doc, suggestion) {
  if (!suggestion) return DecorationSet.empty;
  const { from, to, kind, newText } = suggestion;
  if (from == null || to == null || from >= to) return DecorationSet.empty;
  const decorations = [Decoration.inline(from, to, { class: 'ai-suggestion-strike' })];
  if (kind === 'rewrite' && newText) {
    decorations.push(Decoration.widget(to, () => {
      const span = document.createElement('span');
      span.className = 'ai-suggestion-insert';
      span.textContent = newText;
      return span;
    }, { side: 1 }));
  }
  return DecorationSet.create(doc, decorations);
}

export const AiSuggestionExtension = Extension.create({
  name: 'aiSuggestion',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiSuggestionPluginKey,

        state: {
          init() {
            return { suggestion: null };
          },
          apply(tr, value) {
            const meta = tr.getMeta(aiSuggestionPluginKey);
            if (meta?.type === 'set') return { suggestion: meta.suggestion };
            if (meta?.type === 'clear') return { suggestion: null };
            if (value.suggestion && tr.docChanged) {
              const from = tr.mapping.map(value.suggestion.from);
              const to = tr.mapping.map(value.suggestion.to, -1);
              if (from >= to) return { suggestion: null };
              return { suggestion: { ...value.suggestion, from, to } };
            }
            return value;
          },
        },

        props: {
          decorations(state) {
            return buildDecorations(state.doc, aiSuggestionPluginKey.getState(state).suggestion);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      // kind: 'rewrite' | 'delete'
      setAiSuggestion: (from, to, kind, extra = {}) => ({ tr, dispatch }) => {
        if (dispatch) tr.setMeta(aiSuggestionPluginKey, { type: 'set', suggestion: { from, to, kind, ...extra } });
        return true;
      },
      clearAiSuggestion: () => ({ tr, dispatch }) => {
        if (dispatch) tr.setMeta(aiSuggestionPluginKey, { type: 'clear' });
        return true;
      },
      acceptAiSuggestion: () => ({ state, tr, dispatch }) => {
        const { suggestion } = aiSuggestionPluginKey.getState(state);
        if (!suggestion) return false;
        const { from, to, kind, newText } = suggestion;
        if (dispatch) {
          if (kind === 'delete') tr.delete(from, to);
          else if (kind === 'rewrite') tr.insertText(newText, from, to);
          tr.setMeta(aiSuggestionPluginKey, { type: 'clear' });
          dispatch(tr);
        }
        return true;
      },
    };
  },
});

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { MATH_COMMANDS, commandName } from './mathCommands';

const MAX_AC_RESULTS = 10;

// Find an unclosed single $ before the cursor in the current textblock.
// Returns { from, to, latex } where from = position of the $, to = cursor pos, latex = text inside.
// Returns null if cursor is not inside an open math zone.
function findOpenMathZone(state) {
  const { doc, selection } = state;
  if (!selection.empty) return null;

  const pos = selection.head;
  const $pos = doc.resolve(pos);
  if (!$pos.parent.isTextblock) return null;

  const blockStart = $pos.start();
  const blockText = doc.textBetween(blockStart, $pos.end(), '\n', '￼');
  const cursorOffset = pos - blockStart;
  const textBefore = blockText.substring(0, cursorOffset);

  // Scan backwards for the last unmatched single $.
  // Skip $$ pairs entirely.
  let i = textBefore.length - 1;
  while (i >= 0) {
    if (textBefore[i] === '$') {
      // Part of a $$ pair (this $ has a $ immediately before it)
      if (i > 0 && textBefore[i - 1] === '$') {
        i -= 2;
        continue;
      }
      // Opening of $$ (this $ has a $ immediately after it)
      if (i + 1 < textBefore.length && textBefore[i + 1] === '$') {
        i -= 1;
        continue;
      }
      // Unmatched single $ — we're inside a math zone.
      return {
        from: blockStart + i,
        to: pos,
        latex: textBefore.substring(i + 1),
      };
    }
    i--;
  }
  return null;
}

// Find a completed $..$ or $$...$$ around the cursor for node conversion.
function findMathRange(state, pos) {
  const { doc } = state;
  const $pos = doc.resolve(pos);
  const block = $pos.node();
  if (!block || !block.isTextblock) return null;

  const blockStart = $pos.start();
  const blockEnd = $pos.end();
  const blockText = doc.textBetween(blockStart, blockEnd, '\n', '￼');
  const cursorOffset = pos - blockStart;

  const regex = /(\$\$([^$]*?)\$\$)|(?<!\$)\$([^$]+?)\$(?!\$)/g;
  let match;
  while ((match = regex.exec(blockText)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    if (cursorOffset >= matchStart && cursorOffset <= matchEnd) {
      const display = !!match[1];
      const latex = (display ? match[2] : match[3]).trim();
      if (!latex) continue;
      return { from: blockStart + matchStart, to: blockStart + matchEnd, latex, display };
    }
  }
  return null;
}

// Returns autocomplete suggestions for the partial command after the last \ in latex.
// Returns null when no active autocomplete.
function getAutocomplete(latex) {
  const lastBackslash = latex.lastIndexOf('\\');
  if (lastBackslash === -1) return null;
  const partial = latex.substring(lastBackslash + 1);
  // If there's a space after the \, the command is already complete.
  if (partial.includes(' ')) return null;
  const suggestions = MATH_COMMANDS
    .filter(cmd => commandName(cmd).startsWith(partial))
    .slice(0, MAX_AC_RESULTS);
  if (!suggestions.length) return null;
  return { partial, suggestions };
}

export const MathInputPlugin = Extension.create({
  name: 'mathInputPlugin',

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('mathInputHandler');
    let converting = false;

    // Mutable autocomplete state — lives outside React to drive key handling.
    let acSuggestions = [];
    let acSelectedIdx = 0;
    let prevSuggestionsKey = '';

    function insertSuggestion(view, command) {
      const zone = findOpenMathZone(view.state);
      if (!zone) return;
      const { latex, from } = zone;
      const lastBackslash = latex.lastIndexOf('\\');
      if (lastBackslash === -1) return;

      // +1 because `from` is the position of $, so latex starts at from+1.
      const backslashDocPos = from + 1 + lastBackslash;
      const cursorPos = view.state.selection.head;
      const replacement = '\\' + command + ' ';

      view.dispatch(
        view.state.tr.replaceWith(
          backslashDocPos,
          cursorPos,
          view.state.schema.text(replacement)
        )
      );

      acSuggestions = [];
      acSelectedIdx = 0;
      prevSuggestionsKey = '';
      window.flowtexMathZoneUpdate?.({ suggestions: [], selectedIdx: 0 });
    }

    function emitZoneUpdate(view) {
      const zone = findOpenMathZone(view.state);
      if (!zone) {
        if (acSuggestions.length) {
          acSuggestions = [];
          acSelectedIdx = 0;
          prevSuggestionsKey = '';
        }
        window.flowtexMathZoneUpdate?.({ active: false });
        return;
      }

      const { latex, to } = zone;
      const ac = getAutocomplete(latex);

      if (!ac) {
        acSuggestions = [];
        acSelectedIdx = 0;
        prevSuggestionsKey = '';
      } else {
        const key = ac.suggestions.join(',');
        if (key !== prevSuggestionsKey) {
          // Suggestion list changed — reset selection.
          acSuggestions = ac.suggestions;
          acSelectedIdx = 0;
          prevSuggestionsKey = key;
        }
      }

      const coords = view.coordsAtPos(to);
      window.flowtexMathZoneUpdate?.({
        active: true,
        latex,
        coords,
        suggestions: acSuggestions,
        selectedIdx: acSelectedIdx,
      });
    }

    return [
      new Plugin({
        key: pluginKey,

        props: {
          handleDOMEvents: {
            input: (view, event) => {
              if (converting) return false;
              if (event.inputType !== 'insertText' || event.data !== '$') return false;

              converting = true;
              requestAnimationFrame(() => {
                const { state, dispatch } = view;
                const pos = state.selection.head;
                const range = findMathRange(state, pos);
                if (range) {
                  const { from, to, latex, display } = range;
                  const nodeType = display ? 'katexDisplay' : 'katex';
                  const node = state.schema.nodes[nodeType]?.create({ latex });
                  if (node) {
                    dispatch(state.tr.replaceWith(from, to, node));
                    window.flowtexMathZoneUpdate?.({ active: false });
                  }
                }
                converting = false;
              });
              return false;
            },

            keydown: (view, event) => {
              // Autocomplete keyboard navigation.
              if (acSuggestions.length > 0) {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  acSelectedIdx = Math.min(acSelectedIdx + 1, acSuggestions.length - 1);
                  window.flowtexMathZoneUpdate?.({ selectedIdx: acSelectedIdx });
                  return true;
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  acSelectedIdx = Math.max(acSelectedIdx - 1, 0);
                  window.flowtexMathZoneUpdate?.({ selectedIdx: acSelectedIdx });
                  return true;
                }
                if (event.key === 'Tab' || event.key === 'Enter') {
                  event.preventDefault();
                  insertSuggestion(view, acSuggestions[acSelectedIdx]);
                  return true;
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  acSuggestions = [];
                  acSelectedIdx = 0;
                  prevSuggestionsKey = '';
                  window.flowtexMathZoneUpdate?.({ suggestions: [], selectedIdx: 0 });
                  return true;
                }
              }

              // Space immediately after a committed math node needs special handling
              // to prevent ProseMirror from eating it.
              if (event.key === ' ') {
                const { state, dispatch } = view;
                const $pos = state.doc.resolve(state.selection.head);
                const nodeBefore = $pos.nodeBefore;
                if (
                  nodeBefore &&
                  (nodeBefore.type.name === 'katex' || nodeBefore.type.name === 'katexDisplay')
                ) {
                  event.preventDefault();
                  dispatch(state.tr.insertText(' ', state.selection.head));
                  return true;
                }
              }

              return false;
            },
          },
        },

        view(editorView) {
          // Expose suggestion inserter so the React overlay can call it on click.
          window.flowtexMathInsertSuggestion = (command) => insertSuggestion(editorView, command);

          return {
            update(view) {
              // Skip while a $ conversion is in-flight to avoid a flicker.
              if (!converting) emitZoneUpdate(view);
            },
            destroy() {
              delete window.flowtexMathInsertSuggestion;
            },
          };
        },
      }),
    ];
  },
});

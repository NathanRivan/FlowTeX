import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { MATH_COMMANDS, commandName } from './mathCommands';

const MAX_AC_RESULTS = 10;

// Pure scanner: walks text left-to-right tracking $ / $$ delimiter parity
// and reports the still-open zone at the end of the string, if any.
// Exported for unit testing.
//
// A backward scan (the previous implementation) can't tell a *closing*
// single $ from an *opening* one — it saw the trailing $ of any earlier,
// already-complete "$x$" pair and treated it as a freshly opened zone,
// which spuriously reopened the math popup for any text typed afterward.
// Forward parity tracking treats each $/$$ as a toggle instead.
export function scanOpenMathZone(text) {
  let mode = null; // null | 'single' | 'double'
  let openAt = -1;
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '$') { i++; continue; }
    if (text[i + 1] === '$') {
      if (mode === 'double') { mode = null; openAt = -1; }
      else if (mode === null) { mode = 'double'; openAt = i; }
      i += 2;
    } else {
      if (mode === 'single') { mode = null; openAt = -1; }
      else if (mode === null) { mode = 'single'; openAt = i; }
      i += 1;
    }
  }
  if (mode === null) return null;
  return { openAt, latex: text.substring(openAt + (mode === 'double' ? 2 : 1)) };
}

// Find an unclosed $ or $$ before the cursor in the current textblock.
// Returns { from, to, latex } where from = position of the delimiter, to = cursor pos, latex = text inside.
// Returns null if cursor is not inside an open math zone.
function findOpenMathZone(state) {
  const { doc, selection } = state;
  if (!selection.empty) return null;

  const pos = selection.head;
  const $pos = doc.resolve(pos);
  if (!$pos.parent.isTextblock) return null;

  const blockStart = $pos.start();
  const textBefore = doc.textBetween(blockStart, pos, '\n', '￼');

  const zone = scanOpenMathZone(textBefore);
  if (!zone) return null;
  return { from: blockStart + zone.openAt, to: pos, latex: zone.latex };
}

// Find a completed $..$ or $$...$$ around the cursor for node conversion.
export function findMathRange(state, pos) {
  const { doc } = state;
  const $pos = doc.resolve(pos);
  const block = $pos.node();
  if (!block || !block.isTextblock) return null;

  const blockStart = $pos.start();
  const blockEnd = $pos.end();
  const blockText = doc.textBetween(blockStart, blockEnd, '\n', '￼');
  const cursorOffset = pos - blockStart;

  const regex = /(\$\$([^$]*?)\$\$)|\$([^$]+?)\$(?!\$)/g;
  let match;
  while ((match = regex.exec(blockText)) !== null) {
    // Check the preceding delimiter without lookbehind (Safari < 16.4).
    if (!match[1] && blockText[match.index - 1] === '$') {
      regex.lastIndex = match.index + 1;
      continue;
    }
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
      window.flumenwriteMathZoneUpdate?.({ suggestions: [], selectedIdx: 0 });
    }

    function emitZoneUpdate(view) {
      const zone = findOpenMathZone(view.state);
      if (!zone) {
        if (acSuggestions.length) {
          acSuggestions = [];
          acSelectedIdx = 0;
          prevSuggestionsKey = '';
        }
        window.flumenwriteMathZoneUpdate?.({ active: false });
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
      window.flumenwriteMathZoneUpdate?.({
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
                    window.flumenwriteMathZoneUpdate?.({ active: false });
                    window.flumenwriteMathCommit?.();
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
                  window.flumenwriteMathZoneUpdate?.({ selectedIdx: acSelectedIdx });
                  return true;
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  acSelectedIdx = Math.max(acSelectedIdx - 1, 0);
                  window.flumenwriteMathZoneUpdate?.({ selectedIdx: acSelectedIdx });
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
                  window.flumenwriteMathZoneUpdate?.({ suggestions: [], selectedIdx: 0 });
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
          window.flumenwriteMathInsertSuggestion = (command) => insertSuggestion(editorView, command);

          return {
            update(view) {
              // Skip while a $ conversion is in-flight to avoid a flicker.
              if (!converting) emitZoneUpdate(view);
            },
            destroy() {
              delete window.flumenwriteMathInsertSuggestion;
            },
          };
        },
      }),
    ];
  },
});

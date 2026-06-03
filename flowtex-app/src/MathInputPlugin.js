import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export const MathInputPlugin = Extension.create({
  name: 'mathInputPlugin',

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('mathInputHandler');

    // Helper: given a position, find the entire $...$ or $$...$$ pattern around it
    function findMathRange(state, pos) {
      const { doc } = state;
      const textFrom = Math.max(0, pos - 50); // safety bound
      const textTo = Math.min(doc.content.size, pos + 50);
      const slice = doc.textBetween(textFrom, textTo, '\n', '\ufffc');
      
      // We'll just look at the characters around the cursor
      // Let's do a simpler scan: walk left from pos to count $ and find content start
      let leftDollarCount = 0;
      let i = pos;
      while (i > textFrom && doc.textBetween(i-1, i) === '$') {
        leftDollarCount++;
        i--;
      }
      let rightDollarCount = 0;
      let j = pos;
      while (j < textTo && doc.textBetween(j, j+1) === '$') {
        rightDollarCount++;
        j++;
      }
      
      // total dollars on left and right
      const totalLeft = leftDollarCount;
      const totalRight = rightDollarCount;
      
      // content is between i and j? actually i is start of left $ run, j is end of right $ run
      // but there might be non-$ content after the left run and before the right run
      // We need to find where the content starts after the left dollars.
      let contentStart = pos; // after the left run of dollars (assuming cursor is after left run and maybe in content)
      // Wait, after inserting a $, the cursor is right after the inserted $.
      // So the newly inserted $ is at pos-1. So pos is where cursor is.
      // We'll assume that the left dollar run ends at pos, so contentStart = pos.
      // But there could be more $ after? No, the right run is counted forward.
      // So we'll look for a pattern: left run of $ (of length totalLeft), then content (non-$), then right run of $ (of length totalRight).
      // However, the cursor could be inside content. If user typed $ inside content, then leftDollarCount would be 0, rightDollarCount 0.
      // That case: they just typed a $ and it's isolated, no conversion.
      
      // We need to find the boundaries of the full pattern: we'll search for the nearest $...$ or $$...$$.
      // Scan left from the cursor to find a $ that could be the opening of a math expression.
      // We'll walk left until we hit a character that is not $, then check if there's a $ before that.
      // This is getting messy, but we'll use a proven method: extract the entire paragraph and use regex.
      const paragraph = state.schema.nodes.paragraph ? 'paragraph' : null;
      const $pos = state.doc.resolve(pos);
      const block = $pos.node(); // the parent node
      if (block && block.isTextblock) {
        const blockStart = $pos.start();
        const blockEnd = $pos.end();
        const blockText = state.doc.textBetween(blockStart, blockEnd, '\n', '\ufffc');
        const cursorOffset = pos - blockStart;
        
        // Now apply a single robust regex on blockText to find all math patterns
        const regex = /(\$\$([^\$]*?)\$\$)|(?<!\$)\$([^\$]+?)\$(?!\$)/g;
        let match;
        while ((match = regex.exec(blockText)) !== null) {
          const matchStart = match.index;
          const matchEnd = match.index + match[0].length;
          // Check if cursor is inside this match (including right after the match end)
          if (cursorOffset >= matchStart && cursorOffset <= matchEnd) {
            // Determine type
            const display = !!match[1];
            const latex = (display ? match[2] : match[3]).trim();
            if (!latex) continue;
            const from = blockStart + matchStart;
            const to = blockStart + matchEnd;
            return { from, to, latex, display };
          }
        }
      }
      return null;
    }

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            input: (view, event) => {
              // Only act if the input event added a '$'
              const inputType = event.inputType;
              if (inputType !== 'insertText' || event.data !== '$') return false;

              // Use requestAnimationFrame to ensure the DOM and ProseMirror state are updated
              requestAnimationFrame(() => {
                const { state, dispatch } = view;
                const pos = state.selection.head; // cursor position after insertion
                const range = findMathRange(state, pos);
                if (!range) return;

                const { from, to, latex, display } = range;
                const nodeType = display ? 'katexDisplay' : 'katex';
                const node = state.schema.nodes[nodeType]?.create({ latex });
                if (!node) return;
                const tr = state.tr.replaceWith(from, to, node);
                dispatch(tr);
              });

              return false; // don't prevent default, let $ be typed
            },
          },
        },
      }),
    ];
  },
});
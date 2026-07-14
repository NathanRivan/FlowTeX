import { Extension } from '@tiptap/core';
import { TextSelection } from 'prosemirror-state';
import { autoPageBreakPlugin } from './AutoPageBreakPlugin';

export const AutoPageBreak = Extension.create({
  name: 'autoPageBreak',

  addOptions() {
    return {
      // Called whenever a repagination pass converges (nothing left to fix).
      onSettled: () => {},
    };
  },

  addProseMirrorPlugins() {
    return [autoPageBreakPlugin({ onSettled: this.options.onSettled })];
  },

  addKeyboardShortcuts() {
    return {
      // Enter is intentionally NOT special-cased here. A predictive "is the
      // page full" check (line-height, margins, column math) is fragile and
      // was firing early on pages that still had visible room. Instead Enter
      // falls through to the default split, and autoPageBreakPlugin's RAF
      // repaginate() moves the overflowing block to the next page using the
      // real measured scrollHeight — correct by construction, no prediction.

      // ── Backspace at start of empty first block on a non-first page ───────
      // Once a full page overflows and repaginate() moves the trailing empty
      // paragraph to the top of the next page, pressing Backspace there should:
      // delete that empty paragraph, remove the now-empty page if applicable,
      // and restore the cursor to the end of the previous page's last block —
      // all in one synchronous transaction.
      'Backspace': ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;

        // Plain cursor only.
        if (!empty) return false;

        // doc(0) > page(1) > block(2)
        if ($from.depth !== 2) return false;

        // Cursor must be at the START of the block.
        if ($from.parentOffset !== 0) return false;

        // The block must be EMPTY.
        if ($from.parent.content.size !== 0) return false;

        // Must be the FIRST block in its page.
        if ($from.index(1) !== 0) return false;

        // Must NOT be on the first page (can't backspace off the top).
        const pageIndex = $from.index(0);
        if (pageIndex === 0) return false;

        // Locate the current page's start position.
        const { doc } = state;
        let currentPagePos = 0;
        {
          let pos = 0;
          for (let i = 0; i < pageIndex; i++) pos += doc.child(i).nodeSize;
          currentPagePos = pos;
        }

        const currentPage = doc.child(pageIndex);
        const tr = state.tr;

        if (currentPage.childCount === 1) {
          // Only block on this page — delete the entire page.
          tr.delete(currentPagePos, currentPagePos + currentPage.nodeSize);
        } else {
          // Other blocks remain — delete just this empty first block.
          const blockEnd = currentPagePos + 1 + $from.parent.nodeSize;
          tr.delete(currentPagePos + 1, blockEnd);
        }

        // Place cursor at the last position inside the previous page.
        // currentPagePos - 1 is just before the current page's opening token,
        // which is inside the previous page's content.  Bias -1 moves backward
        // into the previous page's last block.
        try {
          tr.setSelection(
            TextSelection.near(tr.doc.resolve(currentPagePos - 1), -1)
          );
        } catch {}

        tr.scrollIntoView();
        editor.view.dispatch(tr);
        return true;
      },
    };
  },
});

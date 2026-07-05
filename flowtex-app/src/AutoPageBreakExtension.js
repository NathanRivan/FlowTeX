import { Extension } from '@tiptap/core';
import { TextSelection } from 'prosemirror-state';
import { autoPageBreakPlugin } from './AutoPageBreakPlugin';

// Read live so margin changes take effect immediately.
const getBottomPaddingPx = () => window.flumenwritePageSettings?.marginBottomPx ?? 96;
// If the cursor is within this many px of the content-area bottom, treat the
// page as "full" so Enter routes the new paragraph to the next page.
const NEAR_BOTTOM_PX = 40;

export const AutoPageBreak = Extension.create({
  name: 'autoPageBreak',

  addProseMirrorPlugins() {
    return [autoPageBreakPlugin()];
  },

  addKeyboardShortcuts() {
    return {
      // ── Enter at end of a full page ──────────────────────────────────────
      // When the cursor is at the very end of the last top-level block on a
      // nearly-full page, skip the RAF round-trip and create the new paragraph
      // directly at the start of the next page (or create a new page).
      'Enter': ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;

        // Plain cursor only (no selection range).
        if (!empty) return false;

        // doc(0) > page(1) > block(2)
        if ($from.depth !== 2) return false;

        // Parent at depth 1 must be a page node.
        const pageNode = $from.node(1);
        if (!pageNode || pageNode.type.name !== 'page') return false;

        // Cursor must be in the LAST block of the page.
        if ($from.index(1) !== pageNode.childCount - 1) return false;

        // Cursor must be at the very END of that block.
        if ($from.parentOffset !== $from.parent.content.size) return false;

        // Measure distance from the cursor to the actual content-area bottom.
        // Using coordsAtPos avoids the scrollHeight ambiguity that arises when
        // the page has a large min-height (scrollHeight is large even when empty).
        const pageIndex = $from.index(0);
        const pageEls   = editor.view.dom.querySelectorAll('.page-node');
        const contentEl = pageEls[pageIndex]?.querySelector('.page-content');
        if (!contentEl) return false;

        const cursorCoords = editor.view.coordsAtPos($from.pos);
        const contentRect  = contentEl.getBoundingClientRect();
        const columns = window.flumenwritePageSettings?.columns ?? 1;

        if (columns === 2) {
          // Two-column: only route to the next page when the cursor is at the
          // bottom of the RIGHT column. At the bottom of the LEFT column the new
          // line should flow into the right column, so let the default handle it.
          const cs        = getComputedStyle(contentEl);
          const padLeft   = parseFloat(cs.paddingLeft)   || 0;
          const padRight  = parseFloat(cs.paddingRight)  || 0;
          const padBottom = parseFloat(cs.paddingBottom) || 0;
          const gap       = parseFloat(cs.columnGap)     || 0;
          const innerWidth = contentEl.clientWidth - padLeft - padRight;
          const colWidth   = (innerWidth - gap) / 2;
          const col2Left   = contentRect.left + padLeft + colWidth + gap;
          const contentAreaBottom = contentRect.bottom - padBottom;
          const inRightColumn = cursorCoords.left >= col2Left - 4;
          const nearBottom    = contentAreaBottom - cursorCoords.bottom < NEAR_BOTTOM_PX;
          if (!(inRightColumn && nearBottom)) return false;
        } else {
          // Single-column: route when the cursor is near the content-area bottom.
          const contentAreaBottom = contentRect.bottom - getBottomPaddingPx();
          if (contentAreaBottom - cursorCoords.bottom >= NEAR_BOTTOM_PX) return false;
        }

        // The page is full.  Route the new paragraph to the next page.
        const { doc, schema } = state;
        const tr      = state.tr;
        const newPara = schema.nodes.paragraph.create();

        // Find the next page's start position in the document.
        let nextPagePos = null;
        let p = 0;
        for (let i = 0; i < doc.childCount; i++) {
          if (i === pageIndex + 1) { nextPagePos = p; break; }
          p += doc.child(i).nodeSize;
        }

        if (nextPagePos !== null) {
          // Insert new paragraph at the very start of the existing next page.
          const insertAt = nextPagePos + 1;
          tr.insert(insertAt, newPara);
          // Cursor goes inside the new paragraph (one past its opening token).
          try { tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + 1))); } catch {}
        } else {
          // No next page yet — create one.
          let currentPageEnd = 0;
          p = 0;
          for (let i = 0; i < doc.childCount; i++) {
            const child = doc.child(i);
            if (i === pageIndex) { currentPageEnd = p + child.nodeSize; break; }
            p += child.nodeSize;
          }
          const newPage = schema.nodes.page.create({}, [newPara]);
          tr.insert(currentPageEnd, newPage);
          // page-opening(+0) → para-opening(+1) → cursor inside para(+2).
          try { tr.setSelection(TextSelection.near(tr.doc.resolve(currentPageEnd + 2))); } catch {}
        }

        tr.scrollIntoView();
        editor.view.dispatch(tr);
        return true;
      },

      // ── Backspace at start of empty first block on a non-first page ───────
      // When the user presses Enter on a full page the new paragraph goes to
      // the top of the next page.  If they immediately press Backspace, the
      // expected result is: delete that empty paragraph, remove the now-empty
      // page if applicable, and restore the cursor to the end of the previous
      // page's last block — all in one synchronous transaction.
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

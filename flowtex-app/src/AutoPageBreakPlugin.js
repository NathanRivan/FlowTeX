import { Plugin, PluginKey } from 'prosemirror-state';

// Read live from window so page size changes take effect without a reload.
const getPageHeight = () => window.flumenwritePageSettings?.pageHeightPx ?? 1056;
const getColumns   = () => window.flumenwritePageSettings?.columns ?? 1;

export const paginationKey = new PluginKey('pagination');

// Push (overflow) and pull (compaction) are opposite operations on the same
// page boundary — without a guard, pushing a block down can free up just
// enough room for compaction to immediately pull the SAME block back,
// which re-overflows the page, which pushes it again, forever (visible as
// the page stuttering while the keystroke that caused it never lands).
// This checks whether a proposed move would exactly reverse the last one.
export function isReversalOfLastMove(lastMove, direction, pageLow, pageHigh, node) {
  if (!lastMove) return false;
  if (lastMove.direction === direction) return false;
  if (lastMove.pageLow !== pageLow || lastMove.pageHigh !== pageHigh) return false;
  return lastMove.node.eq(node);
}

// In single-column mode a page overflows when its content is taller than the
// page.  In two-column (column-fill: auto) mode the content height is locked,
// so instead the browser spills into a 3rd column when both columns are full —
// that makes scrollWidth exceed clientWidth, which is our overflow signal.
function pageOverflows(contentEl, columns, pageHeight) {
  if (!contentEl) return false;
  if (columns === 2) return contentEl.scrollWidth > contentEl.clientWidth + 10;
  return contentEl.scrollHeight > pageHeight;
}

// Estimate the free vertical space (px) available for new content in a
// two-column page: space left below the last block in its column, plus the
// whole right column if the last block is still in the left one.
function freeSpaceTwoCol(contentEl) {
  const cs        = getComputedStyle(contentEl);
  const padTop    = parseFloat(cs.paddingTop)    || 0;
  const padBottom = parseFloat(cs.paddingBottom) || 0;
  const padLeft   = parseFloat(cs.paddingLeft)   || 0;
  const padRight  = parseFloat(cs.paddingRight)  || 0;
  const gap       = parseFloat(cs.columnGap)     || 0;

  const rect          = contentEl.getBoundingClientRect();
  const colAreaTop    = rect.top + padTop;
  const colAreaBottom = rect.bottom - padBottom;
  const columnHeight  = colAreaBottom - colAreaTop;
  const innerWidth    = contentEl.clientWidth - padLeft - padRight;
  const colWidth      = (innerWidth - gap) / 2;
  const col2Left      = rect.left + padLeft + colWidth + gap;

  const kids = contentEl.children;
  if (!kids.length) return columnHeight * 2;

  const last        = kids[kids.length - 1].getBoundingClientRect();
  const inRightCol  = last.left >= col2Left - 2;
  const freeBelow   = Math.max(0, colAreaBottom - last.bottom);

  return inRightCol ? freeBelow : freeBelow + columnHeight;
}

// Every keystroke is its own transaction, so scheduling repagination on raw
// requestAnimationFrame means it fires between individual keystrokes, not
// after typing settles. Moving/recreating a block's DOM node while a native
// keystroke is still in flight for that same block corrupts or drops input
// (a pressed Enter can appear to do nothing). Debouncing until typing has
// actually paused gives the browser's input pipeline a clear moment to land
// before we touch the DOM.
const REPAGINATE_DEBOUNCE_MS = 200;

// onSettled fires whenever a repaginate() pass finds nothing left to fix —
// e.g. so a bulk import/load can hide a "processing" overlay once pagination
// has actually converged, instead of guessing a fixed delay.
export const autoPageBreakPlugin = ({ onSettled } = {}) => {
  let timerId = null;

  function buildPageMap(doc, pageEls) {
    const pages = [];
    let pos = 0;
    for (let i = 0; i < doc.childCount; i++) {
      const node = doc.child(i);
      const contentEl = pageEls[i]?.querySelector('.page-content');
      pages.push({ index: i, pos, node, contentEl });
      pos += node.nodeSize;
    }
    return pages;
  }

  function repaginate(view) {
    const { state, dispatch } = view;
    const { doc, schema } = state;
    const { skipEmptyCleanup, lastAutoMove } = paginationKey.getState(state);

    if (!schema.nodes.page || view.composing) return;

    const pageEls = Array.from(view.dom.querySelectorAll('.page-node'));
    const pages = buildPageMap(doc, pageEls);

    // --- 1. Explicit page breaks: find a pageBreak node inside a page and split there ---
    for (const { node: pageNode, pos: pagePos } of pages) {
      let breakOffset = null;
      pageNode.forEach((child, offset) => {
        if (child.type.name === 'pageBreak' && breakOffset === null) {
          breakOffset = offset;
        }
      });

      // Skip if break is first child (nothing before it to keep in current page).
      if (breakOffset === null || breakOffset === 0) continue;

      // Collect all blocks that come after the break node.
      const blocksAfter = [];
      pageNode.forEach((child, offset) => {
        if (offset > breakOffset) blocksAfter.push(child);
      });

      // Delete from the break node through the end of the page's content.
      const breakNodeFrom = pagePos + 1 + breakOffset;
      const contentEnd  = pagePos + 1 + pageNode.content.size;

      let tr = state.tr;
      tr = tr.delete(breakNodeFrom, contentEnd);

      const deletedSize     = contentEnd - breakNodeFrom;
      const newPageInsertAt = pagePos + pageNode.nodeSize - deletedSize;
      const newPageContent  = blocksAfter.length > 0
        ? blocksAfter
        : [schema.nodes.paragraph.create()];
      const newPage = schema.nodes.page.create({}, newPageContent);
      tr = tr.insert(newPageInsertAt, newPage);

      tr.setMeta('addToHistory', false);
      tr.setMeta('paginationInternal', true);
      try {
        const { from, to } = state.selection;
        tr = tr.setSelection(
          state.selection.constructor.create(tr.doc, tr.mapping.map(from), tr.mapping.map(to))
        );
      } catch {}
      tr.scrollIntoView();
      dispatch(tr);
      return;
    }

    // --- 2. Overflow: move last block of overflowing page to the next page ---
    const pageHeight = getPageHeight();
    const columns    = getColumns();
    const overflow = pages.find(
      p => pageOverflows(p.contentEl, columns, pageHeight) && p.node.childCount > 1
    );

    if (overflow) {
      const { node: pageNode, pos: pagePos, index: pageIdx } = overflow;
      const lastBlock       = pageNode.lastChild;
      const lastBlockOffset = pageNode.content.size - lastBlock.nodeSize;
      const lastBlockFrom   = pagePos + 1 + lastBlockOffset;
      const lastBlockTo     = lastBlockFrom + lastBlock.nodeSize;
      const nextPage        = pages.find(p => p.index === overflow.index + 1);
      const pageLow  = pageIdx;
      const pageHigh = pageIdx + 1;

      if (!isReversalOfLastMove(lastAutoMove, 'push', pageLow, pageHigh, lastBlock)) {
        let tr = state.tr;
        if (nextPage) {
          tr = tr.delete(lastBlockFrom, lastBlockTo);
          const insertAt = nextPage.pos - lastBlock.nodeSize + 1;
          tr = tr.insert(insertAt, lastBlock);
        } else {
          tr = tr.delete(lastBlockFrom, lastBlockTo);
          const newPage = schema.nodes.page.create({}, [lastBlock.copy(lastBlock.content)]);
          tr = tr.insert(pagePos + pageNode.nodeSize - lastBlock.nodeSize, newPage);
        }

        tr.setMeta('addToHistory', false);
        tr.setMeta('paginationInternal', true);
        tr.setMeta('paginationMove', { direction: 'push', pageLow, pageHigh, node: lastBlock });
        try {
          const { from, to } = state.selection;
          tr = tr.setSelection(
            state.selection.constructor.create(tr.doc, tr.mapping.map(from), tr.mapping.map(to))
          );
        } catch {}
        tr.scrollIntoView();
        dispatch(tr);
        if (view.hasFocus()) view.focus();
      }
      return;
    }

    // --- 3. Empty page removal: drop pages that contain only an empty paragraph,
    //        but only when the cursor is not in them (avoid eating the user's page).
    //        Skipped when skipEmptyCleanup is set (e.g. right after insertNewPage). ---
    if (!skipEmptyCleanup && doc.childCount > 1) {
      const { from: selFrom } = state.selection;
      let pos = 0;
      for (let i = 0; i < doc.childCount; i++) {
        const page    = doc.child(i);
        const pageEnd = pos + page.nodeSize;
        if (
          page.childCount === 1 &&
          page.firstChild.type.name === 'paragraph' &&
          page.firstChild.content.size === 0
        ) {
          const cursorInPage = selFrom > pos && selFrom < pageEnd;
          if (!cursorInPage) {
            const tr = state.tr.delete(pos, pageEnd);
            tr.setMeta('addToHistory', false);
            tr.setMeta('paginationInternal', true);
            try {
              const { from, to } = state.selection;
              tr.setSelection(
                state.selection.constructor.create(tr.doc, tr.mapping.map(from), tr.mapping.map(to))
              );
            } catch {}
            tr.scrollIntoView();
            dispatch(tr);
            return;
          }
        }
        pos += page.nodeSize;
      }
    }

    // --- 4. Compaction: pull first block from next page if it fits in the current page.
    //        Add ~24 px to the block's height to account for inter-paragraph margins.
    //        isReversalOfLastMove (above) is what actually prevents push/pull from
    //        immediately undoing each other; this margin just avoids borderline
    //        thrashing between two DIFFERENT blocks that happen to be similar sizes. ---
    const underfull = pages.find((p, i) => {
      if (!p.contentEl) return false;
      const next = pages[i + 1];
      // Require ≥ 2 blocks in the next page: pulling the only block would leave it
      // empty and violate content: 'block+'.
      if (!next || !next.contentEl || next.node.childCount <= 1) return false;

      const firstBlockEl = next.contentEl.firstElementChild;
      if (!firstBlockEl) return false;

      const firstBlockHeight = firstBlockEl.getBoundingClientRect().height + 24;

      if (columns === 2) {
        // Never pull into a page that is already overflowing.
        if (pageOverflows(p.contentEl, columns, pageHeight)) return false;
        return freeSpaceTwoCol(p.contentEl) >= firstBlockHeight + 30;
      }
      return p.contentEl.scrollHeight + firstBlockHeight <= pageHeight;
    });

    if (underfull) {
      const nextPage      = pages[underfull.index + 1];
      const firstBlock    = nextPage.node.firstChild;
      const pageLow  = underfull.index;
      const pageHigh = underfull.index + 1;

      if (!isReversalOfLastMove(lastAutoMove, 'pull', pageLow, pageHigh, firstBlock)) {
        const firstBlockFrom = nextPage.pos + 1;
        const firstBlockTo   = firstBlockFrom + firstBlock.nodeSize;
        // Insert before the current page's closing token (= end of its content).
        const insertAt = underfull.pos + underfull.node.nodeSize - 1;

        let tr = state.tr;
        // Delete from the next page first (higher position → doesn't shift insertAt).
        tr = tr.delete(firstBlockFrom, firstBlockTo);
        tr = tr.insert(insertAt, firstBlock);

        tr.setMeta('addToHistory', false);
        tr.setMeta('paginationInternal', true);
        tr.setMeta('paginationMove', { direction: 'pull', pageLow, pageHigh, node: firstBlock });
        try {
          const { from, to } = state.selection;
          tr = tr.setSelection(
            state.selection.constructor.create(tr.doc, tr.mapping.map(from), tr.mapping.map(to))
          );
        } catch {}
        tr.scrollIntoView();
        dispatch(tr);
        return;
      }
    }

    // Reached the end without dispatching any fix — pagination has converged.
    onSettled?.();
  }

  return new Plugin({
    key: paginationKey,
    // Track a one-shot "force" flag set by the forceRepaginate meta key.
    // This lets Editor.js trigger repagination after CSS vars are applied,
    // without needing a doc change to satisfy the update() guard.
    state: {
      init: () => ({ force: false, skipEmptyCleanup: false, lastAutoMove: null, wasInternal: false }),
      apply: (tr) => ({
        force: !!tr.getMeta('forceRepaginate'),
        skipEmptyCleanup: !!tr.getMeta('skipEmptyCleanup'),
        // Any transaction other than one of our own tagged push/pull moves
        // clears the guard — it only needs to survive from one auto-move to
        // the very next repaginate cycle, not indefinitely.
        lastAutoMove: tr.getMeta('paginationMove') || null,
        wasInternal: !!tr.getMeta('paginationInternal'),
      }),
    },
    view() {
      return {
        update(v, prev) {
          const { force, wasInternal } = paginationKey.getState(v.state);
          if (v.state.doc === prev.doc && !force) return;
          clearTimeout(timerId);
          // The debounce exists to keep DOM surgery off an in-flight native
          // keystroke — that risk only exists for the FIRST reaction to a
          // genuine external edit. Once we're mid-cascade (this update was
          // caused by our own previous auto-move, not a fresh edit), there's
          // no keystroke left to protect, so run at full speed instead of
          // throttling every step of a large repagination to one per 200ms
          // (that's what made importing a big paper look like it was being
          // paginated by hand, one page at a time, in front of the user).
          const delay = (force || wasInternal) ? 0 : REPAGINATE_DEBOUNCE_MS;
          // requestAnimationFrame (nested for the force/0-delay path too)
          // ensures DOM is laid out before we measure scrollHeight.
          timerId = setTimeout(() => requestAnimationFrame(() => repaginate(v)), delay);
        },
        destroy() {
          clearTimeout(timerId);
        },
      };
    },
  });
};

import { Plugin, PluginKey } from 'prosemirror-state';
import { Node } from 'prosemirror-model';

const PAGE_HEIGHT_PX = 1056;   // 11 inches at 96 dpi
const DEBOUNCE = 200;          // milliseconds

export const autoPageBreakPlugin = () => {
  const pluginKey = new PluginKey('autoPageBreak');

  let timeout = null;

  // Groups top-level blocks into pages based on viewport coordinates
  function paginate(view) {
    const { state, dispatch } = view;
    const { doc } = state;

    // Gather all top-level blocks (exclude existing page and pageBreak nodes)
    const topBlocks = [];
    doc.content.forEach((node, offset) => {
      if (node.type.name === 'page' || node.type.name === 'pageBreak') return;
      topBlocks.push({ node, pos: offset + 1 });
    });

    if (topBlocks.length === 0) return;

    // Measure block positions (viewport coordinates)
    const blocksWithCoords = topBlocks.map(({ node, pos }) => {
      const start = view.coordsAtPos(pos);
      const end = view.coordsAtPos(pos + node.nodeSize);
      return {
        node,
        pos,
        top: start ? start.top : 0,
        bottom: end ? end.bottom : 0,
      };
    });

    // Group into pages
    const pages = [];
    let currentPageBlocks = [];
    let pageStartTop = null;

    for (const block of blocksWithCoords) {
      if (pageStartTop === null) {
        // first block of a page
        pageStartTop = block.top;
        currentPageBlocks.push(block);
      } else if (block.bottom > pageStartTop + PAGE_HEIGHT_PX) {
        // block overflows → finish current page and start new one
        pages.push(currentPageBlocks);
        currentPageBlocks = [block];
        pageStartTop = block.top;
      } else {
        currentPageBlocks.push(block);
      }
    }
    if (currentPageBlocks.length > 0) pages.push(currentPageBlocks);

    // Build a new document with page wrappers
    const pageNodes = pages.map(pageBlocks => {
      const content = pageBlocks.map(b => b.node);
      return state.schema.nodes.page.create({}, content);
    });

    const newDoc = state.schema.nodes.doc.create({}, pageNodes);

    // Preserve selection
    let tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
    tr.setMeta('addToHistory', false);   // don't clutter undo history

    // Attempt to restore selection
    const { from, to } = state.selection;
    try {
      const mappedFrom = tr.mapping.map(from);
      const mappedTo = tr.mapping.map(to);
      tr = tr.setSelection(state.selection.constructor.create(tr.doc, mappedFrom, mappedTo));
    } catch (e) {
      // fallback: put cursor at start
      tr = tr.setSelection(state.selection.constructor.atStart(tr.doc));
    }

    dispatch(tr);
  }

  return new Plugin({
    key: pluginKey,
    view(editorView) {
      const run = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          // Avoid running while a composition is active
          if (editorView.composing) return;
          paginate(editorView);
        }, DEBOUNCE);
      };

      // Initial pagination after editor is ready
      run();

      return {
        update(view, prevState) {
          if (view.state.doc !== prevState.doc) {
            run();
          }
        },
      };
    },
  });
};
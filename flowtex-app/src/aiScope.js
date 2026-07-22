// Extracts exactly what the AI assistant is allowed to see: the current
// selection (or current paragraph, if the cursor is just parked somewhere)
// plus a short title/outline/abstract for orientation — never the full
// document body. See AiPanel.js/supabase/functions/ai-assist for how this
// is used and enforced.

export function getAiScope(editor) {
  const { state } = editor;
  const { selection } = state;
  let from = selection.from;
  let to = selection.to;
  if (selection.empty) {
    const $from = selection.$from;
    if (!$from.parent.isTextblock) return null;
    from = $from.start();
    to = $from.end();
  }
  if (from >= to) return null;
  const text = state.doc.textBetween(from, to, '\n', (node) => (typeof node.attrs?.latex === 'string' ? node.attrs.latex : ''));
  if (!text.trim()) return null;
  return { from, to, text };
}

export function getDocOrientation(doc) {
  let title = '';
  let abstract = '';
  const outline = [];
  doc.descendants((node) => {
    if (node.type.name === 'docTitle' && !title) title = node.textContent;
    else if (node.type.name === 'docAbstract' && !abstract) abstract = node.textContent;
    else if (node.type.name === 'heading') outline.push(node.textContent);
  });
  return { title, abstract: abstract.slice(0, 500), outline: outline.slice(0, 20) };
}

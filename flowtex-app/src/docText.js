// Flattens a ProseMirror doc JSON (page/paragraph/table/... tree) into plain
// text for diffing. Generic by design: any node with `content` recurses,
// any node with `attrs.latex` (katex nodes) contributes its formula text,
// text nodes contribute their text. Applied identically to both sides of a
// diff, so structural artifacts (extra blank lines) cancel out as "unchanged".
export function docToPlainText(docJSON) {
  if (!docJSON) return '';
  const lines = [];
  let current = '';

  function walk(node) {
    if (!node) return;
    if (node.type === 'text') {
      current += node.text || '';
      return;
    }
    if (typeof node.attrs?.latex === 'string') {
      current += node.attrs.latex;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
      lines.push(current);
      current = '';
    }
  }

  walk(docJSON);
  if (current) lines.push(current);
  return lines.join('\n');
}

/**
 * Tiny pub/sub so equation/table node views can re-render when document-wide
 * validation state (label registry, bib keys) changes somewhere ELSE in the
 * doc — a node view's own `update()` only fires when its own node changes,
 * so without this, fixing a \label typo in paragraph 1 wouldn't refresh a
 * \ref-marker sitting inside an equation in paragraph 9.
 */

const listeners = new Set();

export function onValidationChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyValidationChange() {
  listeners.forEach((fn) => fn());
}

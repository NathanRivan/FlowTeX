import { Extension } from '@tiptap/core';
import { autoPageBreakPlugin } from './AutoPageBreakPlugin';

export const AutoPageBreak = Extension.create({
  name: 'autoPageBreak',

  addProseMirrorPlugins() {
    return [autoPageBreakPlugin()];
  },
});
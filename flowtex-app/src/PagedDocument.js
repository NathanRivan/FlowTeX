import { Node } from '@tiptap/core';

// Replaces StarterKit's Document; doc now contains page+ instead of block+
export const PagedDocument = Node.create({
  name: 'doc',
  topNode: true,
  content: 'page+',
});

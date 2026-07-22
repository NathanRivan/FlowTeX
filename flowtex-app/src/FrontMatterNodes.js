import { Node, mergeAttributes } from '@tiptap/core';

// LaTeX front matter (\title, \author, \begin{abstract}) as dedicated node
// types, mirroring how Section/Subsection are styled `heading` variants and
// Blockquote is its own wrapping node — see latexSerializer.js/latexImporter.js
// for the \title{}/\author{}/\begin{abstract} round-trip.

export const DocTitle = Node.create({
  name: 'docTitle',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p[data-type="doc-title"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'doc-title', class: 'doc-title' }), 0];
  },
});

export const DocAuthor = Node.create({
  name: 'docAuthor',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p[data-type="doc-author"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'doc-author', class: 'doc-author' }), 0];
  },
});

export const DocAbstract = Node.create({
  name: 'docAbstract',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="doc-abstract"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'doc-abstract', class: 'doc-abstract' }), 0];
  },

  addCommands() {
    return {
      setDocAbstract: () => ({ commands }) => commands.wrapIn(this.name),
    };
  },
});

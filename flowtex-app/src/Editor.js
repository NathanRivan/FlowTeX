import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { KatexExtension } from './KatexExtension';
import 'katex/dist/katex.min.css';
import './Editor.css';
import { Node as ProsemirrorNode } from 'prosemirror-model';

const Editor = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      KatexExtension,
    ],
    content: '<p>Type $x^2$ to create math.</p>',
    editorProps: {
      handleKeyDown(view, event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'm') {
          event.preventDefault();
          const { state, dispatch } = view;
          const { from, to } = state.selection;
          const selectedText = state.doc.textBetween(from, to, ' ');

          if (selectedText) {
            const mathText = `$${selectedText}$`;
            const transaction = state.tr.insertText(mathText, from, to);
            dispatch(transaction);
          } else {
            editor.commands.insertKatex('');
          }
          return true;
        }
        return false;
      },
    },
  });

  // Input rule to convert $ ... $ into a math node
  if (editor) {
    // This is a simplified approach — we'll add a proper input rule later
    // For now, we can manually handle it in the onUpdate event
    editor.on('update', ({ transaction }) => {
      const doc = editor.state.doc;
      let modified = false;
      const tr = editor.state.tr;

      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          const text = node.text;
          const regex = /\$(.*?)\$/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const start = pos + match.index;
            const end = start + match[0].length;
            const latex = match[1].trim();
            
            // Delete the text node
            tr.delete(start, end);
            // Insert a math node
            tr.insert(start, editor.schema.nodes.katex.create({ latex }));
            modified = true;
          }
        }
      });

      if (modified) {
        editor.view.dispatch(tr);
      }
    });
  }

  if (!editor) return <div>Loading...</div>;

  const insertMath = () => {
    const latex = prompt('Enter LaTeX:', 'x^2');
    if (latex) editor.commands.insertKatex(latex);
  };

  return (
    <div className="editor-container">
      <div className="toolbar">
        <button onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button onClick={insertMath}>
          Insert Math
        </button>
        <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>
          ⌘M to math | Type \m ... \m
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default Editor;
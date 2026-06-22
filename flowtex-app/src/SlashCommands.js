import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from 'prosemirror-state';

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: new PluginKey('slashCommands'),
        items: ({ query }) => {
          const allCommands = [
            {
              title: 'Section',
              // The action is now handled manually, so we just store the type
              action: 'heading1',
            },
            {
              title: 'Subsection',
              action: 'heading2',
            },
            {
              title: 'Bullet List',
              action: 'bulletList',
            },
            {
              title: 'Numbered List',
              action: 'orderedList',
            },
            {
              title: 'Blockquote',
              action: 'blockquote',
            },
            {
              title: 'Divider',
              action: 'horizontalRule'
            },
            {
              title: 'Page Break',
              action: 'pageBreak'
            },
          ];
          return allCommands.filter((item) =>
            item.title.toLowerCase().startsWith(query.toLowerCase())
          );
        },

        render: () => {
          let popup = null;
          let savedEditor = null;
          let savedRange = null;

          const createPopup = () => {
            popup = document.createElement('div');
            popup.className = 'slash-popup';
            Object.assign(popup.style, {
              position: 'fixed',
              zIndex: '999',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              padding: '4px 0',
              minWidth: '200px',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '14px',
              display: 'none',
            });
            document.body.appendChild(popup);
          };

          const destroyPopup = () => {
            if (popup) {
              popup.remove();
              popup = null;
            }
          };

          const executeAction = (action) => {
            if (!savedEditor || !savedRange) return;
            const { from, to } = savedRange;

            // Ensure editor is focused – use Tiptap's own focus command
            savedEditor.commands.focus();

            // Use requestAnimationFrame to make sure focus is applied
            requestAnimationFrame(() => {
              const chain = savedEditor.chain().deleteRange({ from, to });
              switch (action) {
                case 'heading1':
                  chain.setNode('heading', { level: 1 }).run();
                  break;
                case 'heading2':
                  chain.setNode('heading', { level: 2 }).run();
                  break;
                case 'bulletList':
                  chain.toggleBulletList().run();
                  break;
                case 'orderedList':
                  chain.toggleOrderedList().run();
                  break;
                case 'blockquote':
                  chain.setBlockquote().run();
                  break;
                case 'horizontalRule':
                  chain.setHorizontalRule().run();
                  break;
                case 'pageBreak':
                  savedEditor.chain().focus().deleteRange(from, to).insertPageBreak().run();
                  break;
                default:
                  break;
              }
            });
            destroyPopup();
          };

          const renderItems = (items) => {
            if (!popup) createPopup();
            popup.innerHTML = '';
            const rect = savedRange
              ? (() => {
                  try {
                    return savedEditor.view.coordsAtPos(savedRange.from);
                  } catch {
                    return { left: 0, bottom: 0 };
                  }
                })()
              : { left: 0, bottom: 0 };

            popup.style.left = rect.left + 'px';
            popup.style.top = rect.bottom + 5 + 'px';
            popup.style.display = 'block';

            items.forEach((item) => {
              const div = document.createElement('div');
              div.textContent = item.title;
              div.style.padding = '8px 12px';
              div.style.cursor = 'pointer';

              div.addEventListener('mouseenter', () => {
                popup.querySelectorAll('div').forEach(d => d.style.background = 'transparent');
                div.style.background = '#e9ecef';
              });

              // Prevent blur and execute action
              div.addEventListener('mousedown', (e) => {
                e.preventDefault();               // stop editor from losing focus
                executeAction(item.action);       // run transformation
              });

              popup.appendChild(div);
            });
          };

          return {
            onStart: (props) => {
              savedEditor = props.editor;
              savedRange = props.range;
              renderItems(props.items);
            },
            onUpdate: (props) => {
              savedEditor = props.editor;
              savedRange = props.range;
              renderItems(props.items);
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                destroyPopup();
                return true;
              }
              return false;
            },
            onExit: () => {
              destroyPopup();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
import { formatShortcut } from './keyboardShortcuts';

test.each([
  ['Mod+B', 'MacIntel', '⌘B'],
  ['Mod+Shift+L', 'MacIntel', '⇧⌘L'],
  ['Mod+Alt+M', 'MacIntel', '⌥⌘M'],
  ['Mod+C', 'iPad', '⌘C'],
  ['Mod+B', 'Win32', 'Ctrl+B'],
  ['Mod+Shift+L', 'Linux x86_64', 'Ctrl+Shift+L'],
])('formats %s for %s', (binding, platform, expected) => {
  expect(formatShortcut(binding, platform)).toBe(expected);
});

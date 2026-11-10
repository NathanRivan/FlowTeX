export function formatShortcut(binding, platform = navigator.platform) {
  if (!/Mac|iPhone|iPad|iPod/.test(platform)) return binding.replace('Mod', 'Ctrl');
  const symbols = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' };
  const keys = binding.split('+');
  return ['Ctrl', 'Alt', 'Shift', 'Mod'].filter(key => keys.includes(key)).map(key => symbols[key]).join('')
    + keys.filter(key => !symbols[key]).join('');
}

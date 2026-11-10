import { useCallback, useEffect, useState } from 'react';
import { readPreference, writePreference } from './preferenceStorage';

const STORAGE_KEY = 'fw-theme';

export function getInitialTheme() {
  const stored = readPreference(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Shared across every mounted instance (dashboard + editor never render at
// once, but this keeps a toggle in one from ever going stale in the other).
export default function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writePreference(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return [theme, toggleTheme];
}

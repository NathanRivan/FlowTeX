import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useTheme from './useTheme';
import './ThemeToggle.css';

export default function ThemeToggle({ className = '' }) {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className="theme-toggle-icon theme-toggle-icon--sun" size={12} strokeWidth={2.25} />
      <Moon className="theme-toggle-icon theme-toggle-icon--moon" size={11} strokeWidth={2.25} />
      <span className="theme-toggle-thumb" />
    </button>
  );
}

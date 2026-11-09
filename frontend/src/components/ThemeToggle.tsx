import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../services/themeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const Icon = theme === 'light' ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </button>
  );
}

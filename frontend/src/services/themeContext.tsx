import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'ghostledger-theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function readInitialTheme(): Theme {
  let theme: Theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  applyTheme(theme);
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // The theme still applies for this session when storage is blocked.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The resolved default still works for this session when storage is blocked.
    }

    const syncThemeFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      if (
        event.key !== null &&
        event.newValue !== null &&
        event.newValue !== 'light' &&
        event.newValue !== 'dark'
      )
        return;
      const next: Theme = event.newValue === 'dark' ? 'dark' : 'light';
      applyTheme(next);
      setTheme(next);
    };

    window.addEventListener('storage', syncThemeFromAnotherTab);
    return () => window.removeEventListener('storage', syncThemeFromAnotherTab);
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

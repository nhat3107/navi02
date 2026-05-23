import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

function getStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
}

function getResolvedDark(theme: Theme): boolean {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
}

function applyTheme(theme: Theme) {
  const isDark = getResolvedDark(theme);
  document.documentElement.classList.toggle('dark', isDark);
}

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      emitChange();
    }
  };
  mq.addEventListener('change', handler);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    mq.removeEventListener('change', handler);
  };
}

function getSnapshot(): Theme {
  return getStoredTheme();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  const isDark = getResolvedDark(theme);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    emitChange();
  }, []);

  const toggle = useCallback(() => {
    const current = getStoredTheme();
    const currentlyDark = getResolvedDark(current);
    setTheme(currentlyDark ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, isDark, setTheme, toggle };
}

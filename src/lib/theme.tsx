import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'dark' | 'light';
const KEY = 'outstagram_theme';

export function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#0f0f23' : '#f6f7fb');
  try { localStorage.setItem(KEY, t); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

export function useTheme(): [Theme, () => void] {
  const [theme, set] = useState<Theme>(getTheme);
  useEffect(() => {
    const on = (e: Event) => set((e as CustomEvent<Theme>).detail);
    window.addEventListener('themechange', on);
    return () => window.removeEventListener('themechange', on);
  }, []);
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}

/** Sun/moon button that flips light/dark mode; the choice is remembered on this device. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const dark = theme === 'dark';
  return (
    <button type="button" onClick={toggle} role="switch" aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${className}`}>
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

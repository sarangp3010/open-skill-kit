import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Select } from './ui/card';
type Theme = 'light' | 'dark' | 'system';
function initialTheme(): Theme {
  try {
    const value = localStorage.getItem('osk-theme');
    if (value === 'light' || value === 'dark') return value;
  } catch {
    /* Storage can be unavailable. */
  }
  return 'system';
}
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && query.matches),
      );
    };
    apply();
    query.addEventListener('change', apply);
    try {
      localStorage.setItem('osk-theme', theme);
    } catch {
      /* Preference persistence is optional. */
    }
    return () => query.removeEventListener('change', apply);
  }, [theme]);
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-muted-foreground" size={16} aria-hidden="true" />
      <label htmlFor="theme" className="sr-only">
        Color theme
      </label>
      <Select
        id="theme"
        className="h-9 border-0 bg-transparent text-xs shadow-none"
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>
    </div>
  );
}

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../stores/theme';
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const text = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
  return (
    <button type="button" className="header-action" aria-label={text} title={text} onClick={toggle}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

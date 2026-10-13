import { create } from 'zustand';
export type Theme = 'dark' | 'light';
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#12161a' : '#f4f6f8');
  try {
    localStorage.setItem('handoff-theme', theme);
  } catch {
    /* Theme still works when storage is disabled. */
  }
}
export const useTheme = create<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}>((set, get) => ({
  theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));

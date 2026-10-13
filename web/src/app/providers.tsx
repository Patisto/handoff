import { useEffect, type ReactNode } from 'react';
import { useTheme } from '../stores/theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '../api/query';
export function Providers({ children }: { children: ReactNode }) {
  const theme = useTheme((s) => s.theme);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'handoff-theme')
        useTheme.getState().setTheme(event.newValue === 'light' ? 'light' : 'dark');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        theme={theme}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'rgb(var(--panel))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--foreground))',
          },
        }}
      />
    </QueryClientProvider>
  );
}

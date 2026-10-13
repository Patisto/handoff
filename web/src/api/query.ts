import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20000, retry: 1, refetchOnWindowFocus: true } },
});
export const invalidateWorkspace = () =>
  Promise.all(
    [
      'tasks',
      'task',
      'projects',
      'dashboard',
      'activity',
      'files',
      'comments',
      'notifications',
    ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );

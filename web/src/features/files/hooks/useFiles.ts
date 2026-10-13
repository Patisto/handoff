import { useQuery } from '@tanstack/react-query';
import { listFiles } from '../api';
export const useFiles = (scope: { taskId?: string; projectId?: string }) =>
  useQuery({ queryKey: ['files', scope], queryFn: () => listFiles(scope) });

import { useQuery } from '@tanstack/react-query';
import { commentsApi } from '../api';
export const useComments = (id: string) =>
  useQuery({ queryKey: ['comments', id], queryFn: () => commentsApi.list(id) });

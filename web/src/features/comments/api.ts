import { all, post, api } from '../../api/client';
import type { Comment } from './types';
export const commentsApi = {
  list: (id: string) => all<Comment>(`/tasks/${id}/comments`),
  create: (id: string, body: string) => post<Comment>(`/tasks/${id}/comments`, { body }),
  remove: (id: string) => api.delete(`/comments/${id}`),
};

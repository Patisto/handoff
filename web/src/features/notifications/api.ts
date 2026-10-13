import { all, patch } from '../../api/client';
import type { Notification } from './types';
export const notificationsApi = {
  list: () => all<Notification>('/notifications'),
  read: (id: string) => patch(`/notifications/${id}/read`),
  readAll: () => patch('/notifications/read-all'),
};

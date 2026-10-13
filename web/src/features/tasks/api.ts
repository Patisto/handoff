import { all, get, post, patch, api } from '../../api/client';
import type { Task, Status, TaskInput } from './types';
export const tasksApi = {
  list: (params?: object) => all<Task>('/tasks', params),
  get: (id: string) => get<Task>(`/tasks/${id}`),
  create: (input: TaskInput) => post<Task>('/tasks', input),
  update: (id: string, input: Partial<Omit<TaskInput, 'projectId'>>) =>
    patch<Task>(`/tasks/${id}`, input),
  status: (id: string, status: Status, expectedStatus: Status, rejectionReason?: string) =>
    patch<Task>(`/tasks/${id}/status`, { status, expectedStatus, rejectionReason }),
  remove: (id: string) => api.delete(`/tasks/${id}`),
};

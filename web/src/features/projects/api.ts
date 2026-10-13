import { all, get, post, patch, api } from '../../api/client';
import type { Project, ProjectInput } from './types';
export const projectsApi = {
  list: () => all<Project>('/projects'),
  get: (id: string) => get<Project>(`/projects/${id}`),
  create: (input: ProjectInput) => post<Project>('/projects', input),
  update: (id: string, input: Partial<ProjectInput>) => patch<Project>(`/projects/${id}`, input),
  remove: (id: string) => api.delete(`/projects/${id}`),
};

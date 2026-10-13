import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api';
export const useProjects = () => useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
export const useProject = (id: string) =>
  useQuery({ queryKey: ['projects', id], queryFn: () => projectsApi.get(id), enabled: !!id });

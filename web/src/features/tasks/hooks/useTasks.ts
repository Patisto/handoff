import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '../api';
import type { Status, Task, TaskInput } from '../types';
import { errorMessage } from '../../../api/client';
import { invalidateWorkspace } from '../../../api/query';
export const useTasks = (params: object = {}) =>
  useQuery({ queryKey: ['tasks', params], queryFn: () => tasksApi.list(params) });
export const useTask = (id: string | null) =>
  useQuery({ queryKey: ['task', id], queryFn: () => tasksApi.get(id!), enabled: !!id });
export function useTaskMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      expectedStatus,
      rejectionReason,
      patch,
    }: {
      id: string;
      status?: Status;
      expectedStatus?: Status;
      rejectionReason?: string;
      patch?: Partial<Omit<TaskInput, 'projectId'>>;
    }) =>
      status
        ? tasksApi.status(id, status, expectedStatus!, rejectionReason)
        : tasksApi.update(id, patch!),
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey: ['tasks'] });
      await client.cancelQueries({ queryKey: ['task', variables.id] });
      const lists = client.getQueriesData<Task[]>({ queryKey: ['tasks'] });
      const detail = client.getQueryData<Task>(['task', variables.id]);
      const change = (task: Task) =>
        task.id === variables.id
          ? {
              ...task,
              ...variables.patch,
              ...(variables.status
                ? { status: variables.status, rejectionReason: variables.rejectionReason ?? null }
                : {}),
            }
          : task;
      client.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => old?.map(change));
      if (detail) client.setQueryData(['task', variables.id], change(detail));
      return { lists, detail };
    },
    onError: (error, variables, ctx) => {
      ctx?.lists.forEach(([key, data]) => client.setQueryData(key, data));
      if (ctx?.detail) client.setQueryData(['task', variables.id], ctx.detail);
      toast.error(errorMessage(error));
    },
    onSuccess: (data) => {
      client.setQueryData(['task', data.id], data);
      toast.success('Task updated');
    },
    onSettled: () => invalidateWorkspace(),
  });
}

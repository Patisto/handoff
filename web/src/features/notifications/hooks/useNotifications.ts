import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../../api/client';
import { notificationsApi } from '../api';
import type { Notification } from '../types';
export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list });
export function useReadNotification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => (id ? notificationsApi.read(id) : notificationsApi.readAll()),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ['notifications'] });
      const old = client.getQueryData<Notification[]>(['notifications']);
      client.setQueryData<Notification[]>(['notifications'], (data) =>
        data?.map((n) => (!id || n.id === id ? { ...n, read: true } : n)),
      );
      return old;
    },
    onError: (e, _id, old) => {
      client.setQueryData(['notifications'], old);
      toast.error(errorMessage(e));
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

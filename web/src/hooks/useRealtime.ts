import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '../stores/auth';
import { useUI } from '../stores/ui';
import { api, refreshSession } from '../api/client';
import { invalidateWorkspace, queryClient } from '../api/query';
import type { Notification } from '../lib/types';
export function useRealtime() {
  const token = useAuth((s) => s.token);
  const project = useUI((s) => s.projectId);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!token) return;
    const socket = io(`${new URL(api.defaults.baseURL!).origin}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    let active = true;
    socket.on('connect', () => {
      setConnected(true);
      void invalidateWorkspace();
      if (project) socket.emit('project:subscribe', project);
    });
    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect' && active) void refreshSession().catch(() => {});
    });
    for (const event of [
      'task:created',
      'task:updated',
      'task:statusChanged',
      'comment:created',
      'board:refresh',
    ])
      socket.on(event, () => void invalidateWorkspace());
    socket.on('notification:new', (item: Pick<Notification, 'type' | 'payload'>) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(item.payload.title, {
        description: item.payload.body,
        action: item.payload.taskId
          ? { label: 'Open task', onClick: () => useUI.getState().openTask(item.payload.taskId!) }
          : undefined,
      });
    });
    return () => {
      active = false;
      socket.disconnect();
      setConnected(false);
    };
  }, [token, project]);
  return connected;
}

import type { Namespace } from 'socket.io';
let namespace: Namespace | undefined;
export const bindNamespace = (value: Namespace) => {
  namespace = value;
};
export const emitUser = (id: string, event: string, payload: unknown) => {
  namespace?.to(`user:${id}`).emit(event, payload);
};
export function emitTask(
  task: { departmentId: string; projectId: string },
  event: string,
  payload: unknown,
) {
  namespace?.to(`department:${task.departmentId}`).to('managers').emit(event, payload);
  namespace?.to(`project:${task.projectId}`).emit('board:refresh', { projectId: task.projectId });
}
export const disconnectUser = (id: string) => {
  namespace?.in(`user:${id}`).disconnectSockets(true);
};

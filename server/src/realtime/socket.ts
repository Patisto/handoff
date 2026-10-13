import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { identityFromToken, type Identity } from '../middleware/auth.js';
import { db, setIdentity } from '../config/db.js';
import { corsOptions } from '../config/cors.js';
import { bindNamespace } from './emitters.js';
import { id } from '../middleware/validation.js';
export function setupSocket(server: HTTPServer) {
  const io = new Server(server, { cors: corsOptions, maxHttpBufferSize: 16384 });
  const ws = io.of('/ws');
  bindNamespace(ws);
  ws.use(async (socket, next) => {
    try {
      socket.data.user = await identityFromToken(String(socket.handshake.auth.token ?? ''));
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });
  ws.on('connection', (socket) => {
    const user = socket.data.user as Identity;
    void socket.join([
      `user:${user.id}`,
      ...user.departmentIds.map((id) => `department:${id}`),
      ...(user.role === 'MANAGER' ? ['managers'] : []),
    ]);
    const claims = jwt.decode(String(socket.handshake.auth.token)) as jwt.JwtPayload;
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, (claims.exp ?? 0) * 1000 - Date.now()),
    );
    socket.on('disconnect', () => clearTimeout(expiry));
    socket.on(
      'project:subscribe',
      async (value: unknown, ack?: (result: { ok: boolean }) => void) => {
        const parsed = id.safeParse(value);
        if (!parsed.success) return;
        try {
          const allowed = await db.$transaction(async (tx) => {
            await setIdentity(tx, user);
            return tx.project.findUnique({ where: { id: parsed.data }, select: { id: true } });
          });
          if (allowed) {
            for (const room of socket.rooms)
              if (room.startsWith('project:')) void socket.leave(room);
            await socket.join(`project:${parsed.data}`);
          }
          if (typeof ack === 'function') ack({ ok: !!allowed });
        } catch {
          if (typeof ack === 'function') ack({ ok: false });
        }
      },
    );
    socket.on('project:unsubscribe', (value: unknown) => {
      const parsed = id.safeParse(value);
      if (parsed.success) void socket.leave(`project:${parsed.data}`);
    });
  });
  return io;
}

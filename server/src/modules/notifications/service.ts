import type { Context } from '../../middleware/transaction.js';
import type { NotificationPayload } from './types.js';
import { emitUser } from '../../realtime/emitters.js';
import { push } from './push.js';
export async function notify(
  ctx: Context,
  userIds: string[],
  type: string,
  payload: NotificationPayload,
) {
  for (const userId of new Set(userIds)) {
    const notification = { userId, type, payload };
    // No RETURNING: a member can publish a system notification to a manager,
    // but must never SELECT the manager's inbox under RLS.
    await ctx.db.notification.createMany({ data: [notification] });
    ctx.afterCommit(async () => {
      emitUser(userId, 'notification:new', notification);
      await push(userId, payload);
    });
  }
}
export async function managers(ctx: Context) {
  return (
    await ctx.db.user.findMany({ where: { role: 'MANAGER', active: true }, select: { id: true } })
  ).map((u) => u.id);
}
export async function departmentMembers(ctx: Context, departmentId: string) {
  return (
    await ctx.db.user.findMany({
      where: { active: true, departments: { some: { departmentId } } },
      select: { id: true },
    })
  ).map((u) => u.id);
}
export const list = (ctx: Context, query: { limit: number; offset: number; unread?: string }) =>
  ctx.db.notification.findMany({
    where: { userId: ctx.user.id, ...(query.unread === 'true' ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    skip: query.offset,
  });

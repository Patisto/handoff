import type { Context } from '../../middleware/transaction.js';
import type { ActivityMeta } from './types.js';
export async function record(
  ctx: Context,
  action: string,
  scope: { taskId?: string; projectId?: string },
  meta: ActivityMeta = {},
) {
  return ctx.db.activity.create({ data: { ...scope, actorId: ctx.user.id, action, meta } });
}
export const list = (
  ctx: Context,
  query: { projectId?: string; taskId?: string; limit: number; offset: number },
) =>
  ctx.db.activity.findMany({
    where: { projectId: query.projectId, taskId: query.taskId },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    skip: query.offset,
  });

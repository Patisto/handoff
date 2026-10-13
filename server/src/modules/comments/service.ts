import type { Context } from '../../middleware/transaction.js';
import { requireTaskAccess } from '../../middleware/rbac.js';
import { AppError, assertFound } from '../../lib/errors.js';
import { record } from '../activity/service.js';
import { notify, managers, departmentMembers } from '../notifications/service.js';
import { emitTask } from '../../realtime/emitters.js';
import { storage } from '../../config/storage.js';
export async function list(ctx: Context, taskId: string, q: { limit: number; offset: number }) {
  await requireTaskAccess(ctx, taskId);
  return ctx.db.comment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true } }, files: true },
    orderBy: { createdAt: 'desc' },
    take: q.limit,
    skip: q.offset,
  });
}
export async function create(ctx: Context, taskId: string, body: string) {
  const task = await requireTaskAccess(ctx, taskId);
  const comment = await ctx.db.comment.create({
    data: { taskId, userId: ctx.user.id, body },
    include: { user: { select: { id: true, name: true } }, files: true },
  });
  await record(ctx, 'comment.created', { taskId, projectId: task.projectId });
  await notify(
    ctx,
    [...(await managers(ctx)), ...(await departmentMembers(ctx, task.departmentId))].filter(
      (id) => id !== ctx.user.id,
    ),
    'COMMENT',
    {
      title: `New comment · ${task.title}`,
      body: body.slice(0, 200),
      taskId,
      projectId: task.projectId,
    },
  );
  ctx.afterCommit(() => emitTask(task, 'comment:created', comment));
  return comment;
}
export async function remove(ctx: Context, id: string) {
  const comment = assertFound(
    await ctx.db.comment.findUnique({ where: { id }, include: { files: true } }),
  );
  const task = await requireTaskAccess(ctx, comment.taskId);
  if (ctx.user.role !== 'MANAGER' && comment.userId !== ctx.user.id)
    throw new AppError(403, 'Only the author or a manager can delete a comment');
  await ctx.db.comment.delete({ where: { id } });
  await record(ctx, 'comment.deleted', { taskId: task.id, projectId: task.projectId });
  ctx.afterCommit(async () => {
    emitTask(task, 'task:updated', { id: task.id });
    await Promise.all(comment.files.map((f) => storage.delete(f.path)));
  });
  return { id };
}

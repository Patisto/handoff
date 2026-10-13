import type { Context } from '../../middleware/transaction.js';
import type { AttachmentInput } from './types.js';
import { requireTaskAccess } from '../../middleware/rbac.js';
import { AppError, assertFound } from '../../lib/errors.js';
import { storage } from '../../config/storage.js';
import { record } from '../activity/service.js';
import { emitTask } from '../../realtime/emitters.js';
export async function upload(ctx: Context, input: AttachmentInput, file?: Express.Multer.File) {
  if (!file) throw new AppError(422, 'Choose a file to upload');
  let taskId = input.taskId;
  if (input.commentId)
    taskId = assertFound(
      await ctx.db.comment.findUnique({ where: { id: input.commentId } }),
    ).taskId;
  const task = taskId ? await requireTaskAccess(ctx, taskId) : null;
  if (input.projectId)
    assertFound(await ctx.db.project.findUnique({ where: { id: input.projectId } }));
  // Serialize version assignment with the parent lock (including concurrent uploads).
  await ctx.db
    .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${taskId ?? input.projectId!}, 0))`;
  const last = await ctx.db.file.aggregate({
    where: taskId ? { taskId } : { projectId: input.projectId },
    _max: { version: true },
  });
  const key = await storage.save(file.buffer);
  ctx.onRollback(() => storage.delete(key));
  const saved = await ctx.db.file.create({
    data: {
      ...input,
      taskId,
      uploaderId: ctx.user.id,
      path: key,
      originalName: [...file.originalname]
        .map((c) => (c.charCodeAt(0) < 32 || c === '/' || c.charCodeAt(0) === 92 ? '_' : c))
        .join('')
        .slice(0, 255),
      mimeType: file.mimetype,
      size: file.size,
      version: (last._max.version ?? 0) + 1,
    },
  });
  await record(
    ctx,
    'file.uploaded',
    { taskId, projectId: task?.projectId ?? input.projectId },
    { name: saved.originalName, version: saved.version },
  );
  if (task) ctx.afterCommit(() => emitTask(task, 'task:updated', { id: task.id }));
  return saved;
}
export async function get(ctx: Context, id: string) {
  return assertFound(await ctx.db.file.findUnique({ where: { id } }), 'File not found');
}
export const list = (
  ctx: Context,
  q: { taskId?: string; projectId?: string; limit: number; offset: number },
) =>
  ctx.db.file.findMany({
    where: { taskId: q.taskId, projectId: q.projectId },
    orderBy: { version: 'desc' },
    take: q.limit,
    skip: q.offset,
  });

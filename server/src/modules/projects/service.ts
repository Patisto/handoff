import type { Context } from '../../middleware/transaction.js';
import type { CreateProject, UpdateProject } from './types.js';
import type { ProjectStatus } from '@prisma/client';
import { assertFound } from '../../lib/errors.js';
import { record } from '../activity/service.js';
import { storage } from '../../config/storage.js';
import { emitTask } from '../../realtime/emitters.js';
const include = {
  tasks: { select: { id: true, status: true, department: { select: { id: true, name: true } } } },
  _count: { select: { tasks: true } },
} as const;
export const list = (ctx: Context, q: { limit: number; offset: number; status?: ProjectStatus }) =>
  ctx.db.project.findMany({
    where: { status: q.status },
    include,
    orderBy: { createdAt: 'desc' },
    take: q.limit,
    skip: q.offset,
  });
export async function get(ctx: Context, id: string) {
  return assertFound(
    await ctx.db.project.findUnique({ where: { id }, include }),
    'Project not found',
  );
}
export async function create(ctx: Context, input: CreateProject) {
  const project = await ctx.db.project.create({
    data: { ...input, createdById: ctx.user.id },
    include,
  });
  await record(ctx, 'project.created', { projectId: project.id });
  return project;
}
export async function update(ctx: Context, id: string, input: UpdateProject) {
  const project = await ctx.db.project.update({ where: { id }, data: input, include });
  await record(ctx, 'project.updated', { projectId: id });
  ctx.afterCommit(() =>
    emitTask({ projectId: id, departmentId: '' }, 'board:refresh', { projectId: id }),
  );
  return project;
}
export async function remove(ctx: Context, id: string) {
  const files = await ctx.db.file.findMany({
    where: { OR: [{ projectId: id }, { task: { projectId: id } }] },
  });
  const tasks = await ctx.db.task.findMany({ where: { projectId: id } });
  await ctx.db.project.delete({ where: { id } });
  ctx.afterCommit(async () => {
    for (const task of tasks) emitTask(task, 'task:updated', { id: task.id, removed: true });
    await Promise.all(files.map((f) => storage.delete(f.path)));
  });
  return { id };
}

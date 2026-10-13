import { allowedTransition } from './workflow.js';
import type { Context } from '../../middleware/transaction.js';
import type { CreateTask, UpdateTask, StatusUpdate, TaskQuery } from './types.js';
import { requireTaskAccess } from '../../middleware/rbac.js';
import { AppError, assertFound } from '../../lib/errors.js';
import { record } from '../activity/service.js';
import { notify, managers, departmentMembers } from '../notifications/service.js';
import { emitTask } from '../../realtime/emitters.js';
import { storage } from '../../config/storage.js';
export const taskInclude = {
  department: true,
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, clientName: true } },
  _count: { select: { comments: true, files: true } },
} as const;
export async function validateAssignment(
  ctx: Context,
  departmentId: string,
  assigneeId?: string | null,
) {
  assertFound(
    await ctx.db.department.findUnique({ where: { id: departmentId } }),
    'Department not found',
  );
  if (
    assigneeId &&
    !(await ctx.db.user.findFirst({
      where: { id: assigneeId, active: true, departments: { some: { departmentId } } },
    }))
  )
    throw new AppError(422, 'Assignee must be an active member of this department');
}
export async function get(ctx: Context, id: string) {
  await requireTaskAccess(ctx, id);
  return assertFound(await ctx.db.task.findUnique({ where: { id }, include: taskInclude }));
}
export function list(ctx: Context, q: TaskQuery) {
  return ctx.db.task.findMany({
    where: {
      projectId: q.projectId,
      departmentId: q.departmentId,
      status: q.status,
      priority: q.priority,
      assigneeId: q.assigneeId,
      deadline: { lte: q.deadline, gte: q.deadlineFrom },
    },
    include: taskInclude,
    orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    take: q.limit,
    skip: q.offset,
  });
}
export async function create(ctx: Context, input: CreateTask) {
  await validateAssignment(ctx, input.departmentId, input.assigneeId);
  assertFound(
    await ctx.db.project.findUnique({ where: { id: input.projectId } }),
    'Project not found',
  );
  const task = await ctx.db.task.create({
    data: { ...input, createdById: ctx.user.id },
    include: taskInclude,
  });
  await record(
    ctx,
    'task.created',
    { taskId: task.id, projectId: task.projectId },
    { title: task.title },
  );
  await notify(
    ctx,
    task.assigneeId ? [task.assigneeId] : await departmentMembers(ctx, task.departmentId),
    'TASK_ASSIGNED',
    { title: 'New task', body: task.title, taskId: task.id, projectId: task.projectId },
  );
  ctx.afterCommit(() => emitTask(task, 'task:created', task));
  return task;
}
export async function update(ctx: Context, id: string, input: UpdateTask) {
  await ctx.db.$queryRaw`SELECT id FROM tasks WHERE id=${id} FOR UPDATE`;
  const old = await requireTaskAccess(ctx, id);
  const departmentId = input.departmentId ?? old.departmentId;
  const assigneeId =
    input.assigneeId === undefined
      ? departmentId !== old.departmentId
        ? null
        : old.assigneeId
      : input.assigneeId;
  await validateAssignment(ctx, departmentId, assigneeId);
  const task = await ctx.db.task.update({
    where: { id },
    data: {
      ...input,
      assigneeId,
      ...(input.deadline ? { reminderFor: null, overdueFor: null, overdue: false } : {}),
    },
    include: taskInclude,
  });
  await record(ctx, 'task.updated', { taskId: id, projectId: task.projectId });
  if (old.assigneeId !== task.assigneeId || old.departmentId !== task.departmentId)
    await notify(
      ctx,
      task.assigneeId ? [task.assigneeId] : await departmentMembers(ctx, task.departmentId),
      'TASK_ASSIGNED',
      { title: 'Task assigned', body: task.title, taskId: id, projectId: task.projectId },
    );
  ctx.afterCommit(() => {
    if (old.departmentId !== task.departmentId)
      emitTask(old, 'task:updated', { id, removed: true });
    emitTask(task, 'task:updated', task);
  });
  return task;
}
export async function changeStatus(ctx: Context, id: string, input: StatusUpdate) {
  await ctx.db.$queryRaw`SELECT id FROM tasks WHERE id=${id} FOR UPDATE`;
  const old = await requireTaskAccess(ctx, id);
  if (input.expectedStatus && old.status !== input.expectedStatus)
    throw new AppError(409, 'Task changed. Refresh and try again.', 'CONFLICT');
  if (!allowedTransition(ctx.user.role, old.status, input.status))
    throw new AppError(
      403,
      'Members may start a to-do task, then submit it for review. Ask a manager to reopen rejected work.',
      'FORBIDDEN',
    );
  if (old.status === input.status) return get(ctx, id);
  const task = await ctx.db.task.update({
    where: { id },
    data: {
      status: input.status,
      rejectionReason: input.status === 'REJECTED' ? input.rejectionReason : null,
      overdue: input.status === 'APPROVED' ? false : old.deadline < new Date(),
    },
    include: taskInclude,
  });
  await record(
    ctx,
    'task.status_changed',
    { taskId: id, projectId: task.projectId },
    {
      from: old.status,
      to: task.status,
      ...(task.rejectionReason ? { reason: task.rejectionReason } : {}),
    },
  );
  const recipients =
    input.status === 'IN_REVIEW'
      ? await managers(ctx)
      : await departmentMembers(ctx, task.departmentId);
  await notify(
    ctx,
    recipients.filter((uid) => uid !== ctx.user.id),
    'TASK_STATUS',
    {
      title:
        input.status === 'IN_REVIEW'
          ? 'Ready for review'
          : `Task ${input.status.toLowerCase().replaceAll('_', ' ')}`,
      body: task.rejectionReason ?? task.title,
      taskId: id,
      projectId: task.projectId,
    },
  );
  ctx.afterCommit(() => emitTask(task, 'task:statusChanged', task));
  return task;
}
export async function remove(ctx: Context, id: string) {
  const task = await requireTaskAccess(ctx, id);
  const files = await ctx.db.file.findMany({ where: { taskId: id } });
  await ctx.db.task.delete({ where: { id } });
  await record(ctx, 'task.deleted', { projectId: task.projectId }, { title: task.title });
  ctx.afterCommit(async () => {
    emitTask(task, 'task:updated', { id, removed: true });
    await Promise.all(files.map((f) => storage.delete(f.path)));
  });
  return { id };
}

import type { Context } from '../../middleware/transaction.js';
import { assertFound } from '../../lib/errors.js';
import { disconnectUser } from '../../realtime/emitters.js';
import type { DepartmentInput, MembershipInput } from './types.js';
export const list = (ctx: Context) =>
  ctx.db.department.findMany({
    include: {
      users: { include: { user: { select: { id: true, name: true, active: true } } } },
      _count: { select: { tasks: true } },
    },
    orderBy: { name: 'asc' },
  });
export const create = (ctx: Context, input: DepartmentInput) =>
  ctx.db.department.create({ data: input });
export const update = (ctx: Context, id: string, input: DepartmentInput) =>
  ctx.db.department.update({ where: { id }, data: input });
export async function members(ctx: Context, id: string, input: MembershipInput) {
  assertFound(await ctx.db.department.findUnique({ where: { id } }));
  const previous = await ctx.db.userDepartment.findMany({ where: { departmentId: id } });
  await ctx.db.userDepartment.deleteMany({ where: { departmentId: id } });
  await ctx.db.userDepartment.createMany({
    data: [...new Set(input.userIds)].map((userId) => ({ userId, departmentId: id })),
  });
  await ctx.db.task.updateMany({
    where: { departmentId: id, assigneeId: { notIn: input.userIds } },
    data: { assigneeId: null },
  });
  ctx.afterCommit(() => {
    for (const userId of new Set([...previous.map((m) => m.userId), ...input.userIds]))
      disconnectUser(userId);
  });
  return ctx.db.department.findUnique({ where: { id }, include: { users: true } });
}

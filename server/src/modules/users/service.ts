import bcrypt from 'bcryptjs';
import type { Context } from '../../middleware/transaction.js';
import type { CreateUser, UpdateUser } from './types.js';
import { publicUser } from '../auth/service.js';
import { AppError, assertFound } from '../../lib/errors.js';
import { disconnectUser } from '../../realtime/emitters.js';
export const list = (ctx: Context, q: { limit: number; offset: number }) =>
  ctx.db.user.findMany({
    select: publicUser,
    orderBy: { name: 'asc' },
    take: q.limit,
    skip: q.offset,
  });
export async function create(ctx: Context, input: CreateUser) {
  const { password, departmentIds, ...data } = input;
  return ctx.db.user.create({
    data: {
      ...data,
      passwordHash: await bcrypt.hash(password, 12),
      departments: {
        create: [...new Set(departmentIds)].map((departmentId) => ({ departmentId })),
      },
    },
    select: publicUser,
  });
}
export async function update(ctx: Context, id: string, input: UpdateUser) {
  assertFound(await ctx.db.user.findUnique({ where: { id } }));
  if (id === ctx.user.id && input.role === 'MEMBER')
    throw new AppError(422, 'You cannot demote your own account');
  const { password, departmentIds, ...data } = input;
  if (departmentIds) {
    await ctx.db.userDepartment.deleteMany({ where: { userId: id } });
    await ctx.db.userDepartment.createMany({
      data: [...new Set(departmentIds)].map((departmentId) => ({ userId: id, departmentId })),
    });
    await ctx.db.task.updateMany({
      where: { assigneeId: id, departmentId: { notIn: departmentIds } },
      data: { assigneeId: null },
    });
  }
  const user = await ctx.db.user.update({
    where: { id },
    data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
    select: publicUser,
  });
  if (password) await ctx.db.refreshSession.deleteMany({ where: { userId: id } });
  ctx.afterCommit(() => disconnectUser(id));
  return user;
}
export async function deactivate(ctx: Context, id: string) {
  if (id === ctx.user.id) throw new AppError(422, 'You cannot deactivate your own account');
  const user = await ctx.db.user.update({
    where: { id },
    data: { active: false },
    select: publicUser,
  });
  await ctx.db.refreshSession.deleteMany({ where: { userId: id } });
  await ctx.db.pushDevice.deleteMany({ where: { userId: id } });
  await ctx.db.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });
  ctx.afterCommit(() => disconnectUser(id));
  return user;
}

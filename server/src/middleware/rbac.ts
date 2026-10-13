import type { RequestHandler } from 'express';
import type { Context } from './transaction.js';
import { AppError, assertFound } from '../lib/errors.js';
export const requireRole =
  (role: 'MANAGER' | 'MEMBER'): RequestHandler =>
  (req, _res, next) => {
    if (req.user.role !== role)
      return next(new AppError(403, 'Manager access required', 'FORBIDDEN'));
    next();
  };
// Runs inside the request transaction. RLS independently enforces the same boundary.
export async function requireTaskAccess(ctx: Context, id: string) {
  const task = assertFound(await ctx.db.task.findUnique({ where: { id } }), 'Task not found');
  if (ctx.user.role !== 'MANAGER' && !ctx.user.departmentIds.includes(task.departmentId))
    throw new AppError(403, 'Task access denied', 'FORBIDDEN');
  return task;
}

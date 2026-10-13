import type { Context } from '../../middleware/transaction.js';
import { taskInclude } from '../tasks/service.js';
export async function overview(ctx: Context) {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const scope = ctx.user.role === 'MANAGER' ? {} : { assigneeId: ctx.user.id };
  const [
    total,
    inReview,
    overdue,
    approved,
    reviewQueue,
    dueToday,
    myTasks,
    rejected,
    dueSoon,
    overdueTasks,
  ] = await Promise.all([
    ctx.db.task.count({ where: scope }),
    ctx.db.task.count({ where: { ...scope, status: 'IN_REVIEW' } }),
    ctx.db.task.count({ where: { ...scope, deadline: { lt: now }, status: { not: 'APPROVED' } } }),
    ctx.db.task.count({ where: { ...scope, status: 'APPROVED' } }),
    ctx.db.task.findMany({
      where: { ...scope, status: 'IN_REVIEW' },
      include: taskInclude,
      orderBy: { updatedAt: 'asc' },
      take: 30,
    }),
    ctx.db.task.findMany({
      where: { ...scope, deadline: { gte: today, lt: tomorrow }, status: { not: 'APPROVED' } },
      include: taskInclude,
      orderBy: { deadline: 'asc' },
      take: 30,
    }),
    ctx.db.task.findMany({
      where: { assigneeId: ctx.user.id, status: { not: 'APPROVED' } },
      include: taskInclude,
      orderBy: { deadline: 'asc' },
      take: 30,
    }),
    ctx.db.task.findMany({
      where: { ...scope, status: 'REJECTED' },
      include: taskInclude,
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    ctx.db.task.findMany({
      where: {
        ...scope,
        deadline: { gte: now, lte: new Date(now.getTime() + 86400000) },
        status: { not: 'APPROVED' },
      },
      include: taskInclude,
      orderBy: { deadline: 'asc' },
      take: 30,
    }),
    ctx.db.task.findMany({
      where: { ...scope, deadline: { lt: now }, status: { not: 'APPROVED' } },
      include: taskInclude,
      orderBy: { deadline: 'asc' },
      take: 30,
    }),
  ]);
  return {
    counts: { total, inReview, overdue, approved },
    reviewQueue,
    dueToday,
    myTasks,
    rejected,
    dueSoon,
    overdueTasks,
  };
}

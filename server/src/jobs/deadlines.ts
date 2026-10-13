import cron from 'node-cron';
import { db, setIdentity } from '../config/db.js';
import type { Context } from '../middleware/transaction.js';
import { notify, managers, departmentMembers } from '../modules/notifications/service.js';
export async function runDeadlines(overdue: boolean) {
  const effects: (() => void | Promise<void>)[] = [];
  await db.$transaction(
    async (tx) => {
      // Advisory transaction lock makes each job safe across multiple server processes.
      const [lock] = await tx.$queryRaw<
        { locked: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(${overdue ? 84002 : 84001}::bigint) AS locked`;
      if (!lock.locked) return;
      const manager = await tx.user.findFirst({ where: { role: 'MANAGER', active: true } });
      if (!manager) return;
      const user = { id: manager.id, role: manager.role, departmentIds: [] };
      await setIdentity(tx, user);
      const ctx: Context = {
        db: tx,
        user,
        afterCommit: (fn) => effects.push(fn),
        onRollback: () => {},
      };
      const now = new Date();
      const tasks = await tx.task.findMany({
        where: {
          status: { not: 'APPROVED' },
          deadline: overdue ? { lt: now } : { gte: now, lte: new Date(now.getTime() + 86400000) },
        },
      });
      for (const task of tasks) {
        if ((overdue ? task.overdueFor : task.reminderFor)?.getTime() === task.deadline.getTime())
          continue;
        await tx.task.update({
          where: { id: task.id },
          data: overdue
            ? { overdue: true, overdueFor: task.deadline }
            : { reminderFor: task.deadline },
        });
        await notify(
          ctx,
          overdue
            ? await managers(ctx)
            : task.assigneeId
              ? [task.assigneeId]
              : await departmentMembers(ctx, task.departmentId),
          overdue ? 'TASK_OVERDUE' : 'DEADLINE_SOON',
          {
            title: overdue ? 'Task overdue' : 'Due in the next 24 hours',
            body: task.title,
            taskId: task.id,
            projectId: task.projectId,
          },
        );
      }
      await tx.refreshSession.deleteMany({ where: { expiresAt: { lt: now } } });
    },
    { timeout: 60000 },
  );
  await Promise.allSettled(effects.map((fn) => Promise.resolve().then(fn)));
}
export function startJobs() {
  const invoke = (overdue: boolean) =>
    runDeadlines(overdue).catch((error) => console.error('Deadline job failed', error));
  return [
    cron.schedule('*/15 * * * *', () => invoke(false)),
    cron.schedule('0 * * * *', () => invoke(true)),
  ];
}

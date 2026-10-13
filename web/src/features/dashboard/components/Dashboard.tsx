import { ArrowUpRight, CheckCircle2, Clock3, Inbox, Layers } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../../../stores/auth';
import { useUI } from '../../../stores/ui';
import {
  Avatar,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  StatusDot,
} from '../../../components/shared';
import { NewTaskButton } from '../../../app/Layout';
import { shortDate } from '../../../lib/utils';
import type { Task } from '../../../lib/types';
function TaskList({ title, tasks, hint }: { title: string; tasks: Task[]; hint: string }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="section-title">{title}</h2>
        <span className="text-xs text-muted">{tasks.length}</span>
      </div>
      {tasks.length ? (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => useUI.getState().openTask(task.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-white/[.025]"
            >
              <StatusDot status={task.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{task.title}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {task.project.name} · {task.department.name}
                </p>
              </div>
              <span className="text-[10px] text-muted">{shortDate(task.deadline)}</span>
              {task.assignee && <Avatar name={task.assignee.name} />}
              <ArrowUpRight size={13} className="text-muted" />
            </button>
          ))}
        </div>
      ) : (
        <div className="p-5">
          <Empty title="You’re all caught up" body={hint} />
        </div>
      )}
    </section>
  );
}
export function Dashboard() {
  const query = useDashboard();
  const user = useAuth((s) => s.user)!;
  const manager = user.role === 'MANAGER';
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState retry={() => void query.refetch()} />;
  const data = query.data!;
  return (
    <div className="page">
      <PageHeader
        eyebrow="The bigger picture"
        title={`Hey ${user.name.split(' ')[0]}, here’s the handoff.`}
        description={
          manager
            ? 'Keep the work moving. A little feedback can unlock a lot.'
            : 'A little clarity for your next creative sprint.'
        }
        action={<NewTaskButton />}
      />
      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            name: manager ? 'Total tasks' : 'My tasks',
            value: data.counts.total,
            icon: Layers,
            hint: 'Across your workspace',
          },
          {
            name: 'Awaiting review',
            value: data.counts.inReview,
            icon: Inbox,
            hint: 'Ready for a fresh pair of eyes',
          },
          {
            name: 'Overdue',
            value: data.counts.overdue,
            icon: Clock3,
            hint: 'Let’s get these moving',
          },
          {
            name: 'Approved',
            value: data.counts.approved,
            icon: CheckCircle2,
            hint: 'Good work, signed off',
          },
        ].map(({ name, value, icon: Icon, hint }) => (
          <div key={name} className="panel p-5">
            <div className="flex justify-between text-xs text-muted">
              {name}
              <Icon size={15} />
            </div>
            <p className="my-4 text-3xl font-medium tracking-tight">
              {value.toString().padStart(2, '0')}
            </p>
            <p className="text-[10px] text-muted">{hint}</p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <TaskList
          title={manager ? 'Ready for your review' : 'Your next moves'}
          tasks={manager ? data.reviewQueue : data.myTasks}
          hint={
            manager
              ? 'Submissions will appear here when your team is ready for feedback.'
              : 'Assigned work appears here. Check the board for your department’s queue.'
          }
        />
        <TaskList
          title={manager ? 'Due today' : 'Due in the next 24 hours'}
          tasks={manager ? data.dueToday : data.dueSoon}
          hint="Nothing due here. Make space for the next good idea."
        />
        <TaskList
          title="Overdue"
          tasks={data.overdueTasks}
          hint="Everything is on schedule. Keep the momentum."
        />
        <TaskList
          title="Changes requested"
          tasks={data.rejected}
          hint="Tasks needing another pass will appear here, with clear feedback."
        />
      </div>
    </div>
  );
}

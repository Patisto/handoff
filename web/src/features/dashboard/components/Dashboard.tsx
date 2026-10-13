import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Inbox,
  Layers,
  Activity as ActivityIcon,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useOverviewActivity } from '../hooks/useOverviewActivity';
import { useProjects } from '../../projects/hooks/useProjects';
import { useAuth } from '../../../stores/auth';
import { useUI } from '../../../stores/ui';
import {
  Avatar,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  StatusDot,
  StatusBadge,
} from '../../../components/shared';
import { NewTaskButton } from '../../../app/Layout';
import { shortDate, relativeDate, label, cn } from '../../../lib/utils';
import type { Task } from '../../../lib/types';
function TaskList({
  id,
  title,
  tasks,
  hint,
  kicker,
}: {
  id: string;
  title: string;
  tasks: Task[];
  hint: string;
  kicker: string;
}) {
  return (
    <section id={id} className="panel scroll-mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow mb-1.5">{kicker}</p>
          <h2 className="section-title">{title}</h2>
        </div>
        <span className="badge">{tasks.length}</span>
      </div>
      {tasks.length ? (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => useUI.getState().openTask(task.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-accent/5"
            >
              <StatusDot status={task.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{task.title}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {task.project.name} · {task.department.name}
                </p>
              </div>
              <span className="hidden text-[10px] text-muted sm:inline">
                {shortDate(task.deadline)}
              </span>
              {task.assignee && <Avatar name={task.assignee.name} />}
              <span className="hidden 2xl:inline-flex">
                <StatusBadge status={task.status} />
              </span>
              <ArrowUpRight size={13} className="shrink-0 text-muted" />
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <Empty title="You’re all caught up" body={hint} />
        </div>
      )}
    </section>
  );
}
export function Dashboard() {
  const query = useDashboard();
  const projects = useProjects();
  const activity = useOverviewActivity();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const manager = user.role === 'MANAGER';
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState retry={() => void query.refetch()} />;
  const data = query.data!;
  const activeProjects = projects.data?.filter((p) => p.status === 'ACTIVE') ?? [];
  const approvedPercent = data.counts.total
    ? Math.round((data.counts.approved / data.counts.total) * 100)
    : 0;
  function openBoard() {
    useUI.getState().setFilter('projectId', '');
    navigate('/board');
  }
  const metrics = [
    {
      name: manager ? 'Total tasks' : 'My tasks',
      value: data.counts.total,
      icon: Layers,
      tone: 'text-accent bg-accent/10',
      action: openBoard,
      hint: manager ? 'Across the workspace' : 'Assigned to you',
    },
    {
      name: 'Waiting for review',
      value: data.counts.inReview,
      icon: Inbox,
      tone: 'text-warning bg-warning/10',
      action: () => document.getElementById('review-queue')?.scrollIntoView({ block: 'start' }),
      hint: 'Ready for the next handoff',
    },
    {
      name: 'Overdue tasks',
      value: data.counts.overdue,
      icon: Clock3,
      tone: 'text-danger bg-danger/10',
      action: () => document.getElementById('overdue-tasks')?.scrollIntoView({ block: 'start' }),
      hint: 'A little attention needed',
    },
    {
      name: 'Approved work',
      value: data.counts.approved,
      icon: CheckCircle2,
      tone: 'text-success bg-success/10',
      action: openBoard,
      hint: 'Good work, signed off',
    },
  ];
  return (
    <div className="page">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('en', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(new Date())}
        title={
          <>
            Let’s make good work <span className="text-accent">move.</span>
          </>
        }
        description={
          manager
            ? 'Here’s what needs your attention across the studio.'
            : 'Your next moves, feedback, and deadlines — all in one place.'
        }
        action={<NewTaskButton />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(({ name, value, icon: Icon, tone, action, hint }) => (
          <button key={name} onClick={action} className="metric-card">
            <span className={cn('metric-icon', tone)}>
              <Icon size={16} />
            </span>
            <strong>{value.toString().padStart(2, '0')}</strong>
            <p className="mt-2 text-xs text-soft">{name}</p>
            <p className="mt-2 flex items-center justify-between text-[10px] text-muted">
              {hint}
              <ArrowUpRight size={12} />
            </p>
          </button>
        ))}
      </div>
      <div className="studio-layout">
        <div className="min-w-0 space-y-4">
          <TaskList
            id="review-queue"
            kicker={manager ? 'Priority queue' : 'Your workload'}
            title={manager ? 'Ready for your review' : 'Your next moves'}
            tasks={manager ? data.reviewQueue : data.myTasks}
            hint={
              manager
                ? 'Submissions will appear here when your team is ready for feedback.'
                : 'Assigned work appears here. Check the board for your department’s queue.'
            }
          />
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="eyebrow mb-1.5">In the studio</p>
                <h2 className="section-title">Active projects</h2>
              </div>
              <Link to="/projects" className="text-xs text-accent">
                View all →
              </Link>
            </div>
            {projects.isLoading ? (
              <Loading />
            ) : projects.isError ? (
              <ErrorState retry={() => void projects.refetch()} />
            ) : activeProjects.length ? (
              <div className="divide-y divide-border">
                {activeProjects.slice(0, 5).map((p) => {
                  const done = p.tasks.filter((t) => t.status === 'APPROVED').length;
                  const percent = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="grid grid-cols-[4px_minmax(0,1fr)_85px] items-center gap-3 px-5 py-4 transition hover:bg-accent/5 sm:grid-cols-[4px_minmax(0,1fr)_120px_48px]"
                    >
                      <span className="h-9 rounded bg-accent/70" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{p.name}</p>
                        <p className="mt-1 text-[10px] text-muted">
                          {p.clientName} · {p.tasks.length} tasks
                        </p>
                      </div>
                      <div>
                        <p className="mb-2 flex justify-between text-[10px] text-muted">
                          <span className="text-foreground">{percent}%</span>approved
                        </p>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                      <time className="hidden text-right text-[10px] text-muted sm:block">
                        {shortDate(p.deadline)}
                      </time>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-5">
                <Empty
                  title="Space for the next idea"
                  body={
                    manager
                      ? 'Create a project and turn the brief into clear tasks.'
                      : 'Projects appear when work is assigned to your department.'
                  }
                />
              </div>
            )}
          </section>
          <TaskList
            id="due-tasks"
            kicker="Keep an eye on"
            title={manager ? 'Due today' : 'Due in the next 24 hours'}
            tasks={manager ? data.dueToday : data.dueSoon}
            hint="Nothing due here. Make space for the next good idea."
          />
          <TaskList
            id="overdue-tasks"
            kicker="Needs attention"
            title="Overdue tasks"
            tasks={data.overdueTasks}
            hint="Everything is on schedule. Keep the momentum."
          />
          <TaskList
            id="rejected-tasks"
            kicker="The next iteration"
            title="Changes requested"
            tasks={data.rejected}
            hint="Tasks needing another pass will appear here, with clear feedback."
          />
        </div>
        <aside className="min-w-0 space-y-4" aria-label="Studio summary">
          <section className="studio-pulse">
            <div className="studio-pulse-content">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c5dde1]">
                {manager ? 'Studio pulse' : 'Your progress'}
              </p>
              <p className="mt-5 font-display text-5xl font-medium">
                {approvedPercent}
                <span className="ml-1 text-lg text-[#c5dde1]">%</span>
              </p>
              <h2 className="mt-3 max-w-[190px] font-display text-xl font-medium">
                {data.counts.total ? 'Good work is moving.' : 'Every idea starts here.'}
              </h2>
              <p className="mt-2 max-w-[195px] text-xs leading-6 text-[#c5dde1]">
                {data.counts.approved} of {data.counts.total} {manager ? 'visible' : 'assigned'}{' '}
                tasks approved.
                {data.counts.inReview > 0
                  ? ` ${data.counts.inReview} waiting for review.`
                  : ' Your next handoff starts on the board.'}
              </p>
              <button
                onClick={openBoard}
                className="mt-5 flex items-center gap-2 text-xs text-[#d7ffff]"
              >
                Open the board
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1.5">Workspace feed</p>
                <h2 className="section-title">Recent activity</h2>
              </div>
              <ActivityIcon size={16} className="text-accent" />
            </div>
            {activity.isLoading ? (
              <Loading />
            ) : activity.isError ? (
              <ErrorState retry={() => void activity.refetch()} />
            ) : activity.data?.length ? (
              <div className="divide-y divide-border">
                {activity.data.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-4">
                    <Avatar name={item.actor.name} />
                    <div className="min-w-0 text-xs leading-5">
                      <p className="text-soft">
                        <span className="font-medium text-foreground">{item.actor.name}</span>{' '}
                        {item.action.replaceAll('.', ' ').replaceAll('_', ' ')}
                      </p>
                      {item.meta.to && (
                        <p className="text-[10px] text-accent">
                          {label(item.meta.from ?? '')} → {label(item.meta.to)}
                        </p>
                      )}
                      <time className="mt-1 block text-[10px] text-muted">
                        {relativeDate(item.createdAt)}
                      </time>
                      {item.taskId && (
                        <button
                          className="mt-1 text-[10px] text-accent"
                          onClick={() => useUI.getState().openTask(item.taskId!)}
                        >
                          Open task →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-3 text-xs leading-6 text-muted">
                Task updates and conversations will appear here as your team gets moving.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

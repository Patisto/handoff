import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check, RotateCcw, Trash2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useUI } from '../../../stores/ui';
import { useAuth } from '../../../stores/auth';
import { useTask, useTaskMutation } from '../hooks/useTasks';
import { useDirectory } from '../../admin/hooks/useDirectory';
import { Sheet } from '../../../components/ui/sheet';
import { Button } from '../../../components/ui/button';
import { Avatar, Loading, ErrorState, StatusBadge } from '../../../components/shared';
import { Comments } from '../../comments/components/Comments';
import { Files } from '../../files/components/Files';
import {
  priorities,
  statuses,
  type Task,
  type Status,
  type Activity,
  type Priority,
} from '../../../lib/types';
import { label, inputDate, relativeDate } from '../../../lib/utils';
import { all, errorMessage } from '../../../api/client';
import { tasksApi } from '../api';
import { invalidateWorkspace } from '../../../api/query';
export function TaskDrawer() {
  const id = useUI((s) => s.taskId);
  const query = useTask(id);
  return (
    <Sheet
      open={!!id}
      onOpenChange={(v) => {
        if (!v) useUI.getState().openTask(null);
      }}
      title="Task detail"
      description="The brief, the work, and the conversation."
    >
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} message={errorMessage(query.error)} />
      ) : (
        query.data && <Detail key={query.data.id} task={query.data} />
      )}
    </Sheet>
  );
}
function Detail({ task }: { task: Task }) {
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  const mutation = useTaskMutation();
  const { users, departments } = useDirectory();
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<'work' | 'activity'>('work');
  const activity = useQuery({
    queryKey: ['activity', task.id],
    queryFn: () => all<Activity>('/activity', { taskId: task.id }),
    enabled: tab === 'activity',
  });
  const remove = useMutation({
    mutationFn: () => tasksApi.remove(task.id),
    onSuccess: () => {
      useUI.getState().openTask(null);
      toast.success('Task deleted');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => invalidateWorkspace(),
  });
  function status(value: Status) {
    if (value === 'REJECTED') {
      setReject(true);
      return;
    }
    mutation.mutate({ id: task.id, status: value, expectedStatus: task.status });
  }
  const editableStatuses = manager
    ? statuses
    : [
        task.status,
        ...(task.status === 'TODO'
          ? ['IN_PROGRESS' as const]
          : task.status === 'IN_PROGRESS'
            ? ['IN_REVIEW' as const]
            : []),
      ];
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-[#141417]/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Avatar name={task.assignee?.name ?? 'Unassigned'} />
          <span className="text-xs">{task.assignee?.name ?? 'Unassigned'}</span>
        </div>
        <time className="text-xs text-muted">Due {relativeDate(task.deadline)}</time>
      </div>
      <div className="space-y-7 p-6">
        <div>
          <Link
            onClick={() => useUI.getState().openTask(null)}
            to={`/projects/${task.projectId}`}
            className="mb-3 flex items-center gap-1.5 text-[11px] text-muted"
          >
            {task.project.name}
            <ArrowUpRight size={11} />
          </Link>
          <h2 className="text-2xl font-semibold leading-snug tracking-tight">{task.title}</h2>
          <div className="mt-4 flex gap-2">
            <StatusBadge status={task.status} />
            <span className="badge">{task.department.name}</span>
            {manager && (
              <button
                onClick={() => setEditing(!editing)}
                className="ml-auto text-xs text-muted hover:text-foreground"
              >
                {editing ? 'Cancel edit' : 'Edit brief'}
              </button>
            )}
          </div>
        </div>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              mutation.mutate(
                {
                  id: task.id,
                  patch: {
                    title: String(f.get('title')),
                    description: String(f.get('description')),
                  },
                },
                { onSuccess: () => setEditing(false) },
              );
            }}
          >
            <label className="field">
              Title
              <input name="title" required maxLength={200} defaultValue={task.title} />
            </label>
            <label className="field">
              Description
              <textarea name="description" rows={5} defaultValue={task.description} />
            </label>
            <Button disabled={mutation.isPending}>Save brief</Button>
          </form>
        ) : (
          <p className="whitespace-pre-wrap text-xs leading-7 text-[#b3b3bd]">
            {task.description ||
              'No description yet. Add context so the team knows what success looks like.'}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <label className="field">
            Status
            <select
              value={task.status}
              disabled={mutation.isPending}
              onChange={(e) => status(e.target.value as Status)}
            >
              {editableStatuses.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Priority
            <select
              disabled={!manager || mutation.isPending}
              value={task.priority}
              onChange={(e) =>
                mutation.mutate({ id: task.id, patch: { priority: e.target.value as Priority } })
              }
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Department
            <select
              disabled={!manager || mutation.isPending}
              value={task.departmentId}
              onChange={(e) =>
                mutation.mutate({
                  id: task.id,
                  patch: { departmentId: e.target.value, assigneeId: null },
                })
              }
            >
              {(manager ? departments : [task.department]).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Assignee
            <select
              disabled={!manager || mutation.isPending}
              value={task.assigneeId ?? ''}
              onChange={(e) =>
                mutation.mutate({ id: task.id, patch: { assigneeId: e.target.value || null } })
              }
            >
              <option value="">Department queue</option>
              {manager
                ? users
                    .filter(
                      (u) =>
                        u.active && u.departments.some((d) => d.departmentId === task.departmentId),
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))
                : task.assignee && <option value={task.assignee.id}>{task.assignee.name}</option>}
            </select>
          </label>
          <label className="field col-span-2">
            Deadline
            <input
              key={task.deadline}
              type="datetime-local"
              disabled={!manager || mutation.isPending}
              defaultValue={inputDate(task.deadline)}
              onBlur={(e) => {
                if (
                  manager &&
                  e.target.value &&
                  new Date(e.target.value).getTime() !== new Date(task.deadline).getTime()
                )
                  mutation.mutate({
                    id: task.id,
                    patch: { deadline: new Date(e.target.value).toISOString() },
                  });
              }}
            />
          </label>
        </div>
        {task.rejectionReason && (
          <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-4">
            <p className="mb-2 text-xs font-medium text-rose-300">Changes requested</p>
            <p className="whitespace-pre-wrap text-xs leading-6 text-[#c6adb5]">
              {task.rejectionReason}
            </p>
            {manager ? (
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => status('TODO')}
                disabled={mutation.isPending}
              >
                <RotateCcw size={12} />
                Reopen for revisions
              </Button>
            ) : (
              <p className="mt-3 text-[10px] text-muted">
                Your manager can reopen this task for revisions.
              </p>
            )}
          </div>
        )}
        {manager && task.status === 'IN_REVIEW' && (
          <div className="flex gap-2">
            <Button disabled={mutation.isPending} onClick={() => status('APPROVED')}>
              <Check size={14} />
              Approve work
            </Button>
            <Button variant="outline" onClick={() => setReject(true)}>
              Request changes
            </Button>
          </div>
        )}
        {reject && manager && (
          <form
            className="space-y-3 rounded-lg border border-rose-400/20 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(
                {
                  id: task.id,
                  status: 'REJECTED',
                  expectedStatus: task.status,
                  rejectionReason: reason,
                },
                {
                  onSuccess: () => {
                    setReject(false);
                    setReason('');
                  },
                },
              );
            }}
          >
            <label className="field">
              What needs to change?
              <textarea
                autoFocus
                required
                maxLength={5000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Be specific so the team can move forward."
              />
            </label>
            <div className="flex gap-2">
              <Button variant="destructive" disabled={!reason.trim() || mutation.isPending}>
                Request changes
              </Button>
              <Button type="button" variant="ghost" onClick={() => setReject(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        <div className="flex gap-5 border-b border-border text-xs">
          {(['work', 'activity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 ${tab === t ? 'border-b-2 border-accent text-foreground' : 'text-muted'}`}
            >
              {t === 'work' ? 'Work & conversation' : 'Activity'}
            </button>
          ))}
        </div>
        {tab === 'work' ? (
          <>
            <Files taskId={task.id} />
            <div className="border-t border-border" />
            <Comments taskId={task.id} />
          </>
        ) : activity.isLoading ? (
          <Loading />
        ) : activity.isError ? (
          <ErrorState retry={() => void activity.refetch()} />
        ) : (
          <div className="space-y-5">
            {activity.data?.map((item) => (
              <div key={item.id} className="flex gap-3">
                <Avatar name={item.actor.name} />
                <div>
                  <p className="text-xs">
                    <span className="font-medium">{item.actor.name}</span>{' '}
                    <span className="text-muted">
                      {item.action.replaceAll('.', ' ').replaceAll('_', ' ')}
                    </span>
                  </p>
                  {item.meta.to && (
                    <p className="mt-1 text-xs text-accent">
                      {label(item.meta.from ?? '')} → {label(item.meta.to)}
                    </p>
                  )}
                  <time className="mt-1 block text-[10px] text-muted">
                    {relativeDate(item.createdAt)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        )}
        {manager && (
          <div className="border-t border-border pt-5">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-xs text-rose-300">
                  Delete this task, its files, and all comments? This cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Delete permanently
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={12} />
                Delete task
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  MessageSquare,
  Paperclip,
  Plus,
  CalendarDays,
  SlidersHorizontal,
  ArrowUpRight,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Task, Status } from '../types';
import { statuses, priorities } from '../../../lib/types';
import { useBoard } from '../hooks/useBoard';
import { useTaskMutation } from '../../tasks/hooks/useTasks';
import { useProjects } from '../../projects/hooks/useProjects';
import { useDirectory } from '../../admin/hooks/useDirectory';
import { useAuth } from '../../../stores/auth';
import { useUI } from '../../../stores/ui';
import { Avatar, StatusDot, Loading, ErrorState, PageHeader } from '../../../components/shared';
import { Button } from '../../../components/ui/button';
import { NewTaskButton, SearchField } from '../../../app/Layout';
import { cn, label, shortDate } from '../../../lib/utils';
function Card({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: overlay,
  });
  const overdue = new Date(task.deadline) < new Date() && task.status !== 'APPROVED';
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
      }}
      className={cn(
        'kanban-card group relative rounded-lg border border-border bg-panel p-3.5 transition-[box-shadow,border-color] hover:border-accent/50 hover:shadow-md',
        isDragging && 'opacity-25',
        overlay && 'rotate-2 scale-[1.03] border-accent/60 shadow-2xl',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="max-w-[180px] truncate text-[10px] text-muted">
          {task.project.clientName}
          <span className="px-1.5 text-muted">/</span>
          {task.department.name}
        </span>
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag ${task.title}`}
          className="-mr-1 touch-none rounded p-1 text-muted hover:bg-raised hover:text-foreground"
        >
          <GripVertical size={13} />
        </button>
      </div>
      <button onClick={() => useUI.getState().openTask(task.id)} className="w-full text-left">
        <h3 className="text-[12px] font-medium leading-[1.6] tracking-[-.01em]">{task.title}</h3>
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={cn(
            'rounded border px-1.5 py-0.5 text-[9px]',
            task.priority === 'URGENT'
              ? 'border-danger/20 bg-danger/5 text-danger'
              : task.priority === 'HIGH'
                ? 'border-warning/20 bg-warning/10 text-warning'
                : task.priority === 'NORMAL'
                  ? 'border-accent/20 bg-accent/10 text-accent'
                  : 'border-border text-muted',
          )}
        >
          {task.priority === 'URGENT' ? '↑↑ ' : task.priority === 'HIGH' ? '↑ ' : ''}
          {label(task.priority)}
        </span>
        {task.status === 'REJECTED' && (
          <span className="text-[9px] text-danger">Needs revision</span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span
          className={cn(
            'flex items-center gap-1.5 text-[10px]',
            overdue ? 'text-danger/90' : 'text-muted',
          )}
        >
          <CalendarDays size={11} />
          {shortDate(task.deadline)}
        </span>
        <div className="flex items-center gap-2.5">
          {task._count.comments > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-muted">
              <MessageSquare size={11} />
              {task._count.comments}
            </span>
          )}
          {task._count.files > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-muted">
              <Paperclip size={11} />
              {task._count.files}
            </span>
          )}
          {task.assignee ? (
            <Avatar name={task.assignee.name} />
          ) : (
            <span
              className="h-6 w-6 rounded-full border border-dashed border-border"
              title="Unassigned"
            />
          )}
        </div>
      </div>
    </article>
  );
}
function Column({ status, tasks }: { status: Status; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  return (
    <section
      ref={setNodeRef}
      className={cn(
        'kanban-column min-h-[490px] min-w-[258px] w-[258px] flex-1 shrink-0 rounded-xl border border-border p-3 transition-colors',
        isOver ? 'bg-accent/[.07] ring-1 ring-accent/30' : 'bg-background/40',
      )}
      aria-label={`${label(status)} column`}
    >
      <header className="mb-3 flex h-8 items-center gap-2 px-1">
        <StatusDot status={status} />
        <h2 className="text-[11px] font-medium">{label(status)}</h2>
        <span className="ml-0.5 rounded-md bg-border/60 px-1.5 py-0.5 text-[10px] text-muted">
          {tasks.length}
        </span>
        {manager && status === 'TODO' && (
          <button
            aria-label="Add a task"
            className="ml-auto text-muted hover:text-foreground"
            onClick={() => useUI.getState().setCreateTask(true)}
          >
            <Plus size={14} />
          </button>
        )}
      </header>
      <div className="space-y-2.5">
        {tasks.map((task) => (
          <Card key={task.id} task={task} />
        ))}
        {!tasks.length && (
          <div className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-[11px] leading-5 text-muted">
            {status === 'TODO'
              ? 'New tasks start here.'
              : status === 'IN_REVIEW'
                ? 'Submitted work lands here.'
                : status === 'APPROVED'
                  ? 'The finish line. Nice work.'
                  : status === 'REJECTED'
                    ? 'Feedback becomes the next step.'
                    : 'Ready when your team is.'}
          </div>
        )}
        {manager && status === 'TODO' && (
          <button
            onClick={() => useUI.getState().setCreateTask(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-[11px] text-muted hover:bg-raised hover:text-foreground"
          >
            <Plus size={13} />
            Add task
          </button>
        )}
      </div>
    </section>
  );
}
export function Board({ embedded = false }: { embedded?: boolean }) {
  const query = useBoard();
  const { data: projects = [] } = useProjects();
  const { departments } = useDirectory();
  const filters = useUI();
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  const mutation = useTaskMutation();
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  function drop(e: DragEndEvent) {
    setActive(null);
    if (!e.over || mutation.isPending) return;
    const task = query.tasks.find((t) => t.id === e.active.id);
    const target = String(e.over.id);
    const status = statuses.includes(target as Status)
      ? (target as Status)
      : query.tasks.find((t) => t.id === target)?.status;
    if (!task || !status || task.status === status) return;
    if (status === 'REJECTED') {
      filters.openTask(task.id);
      toast('Add a rejection reason in the task drawer.');
      return;
    }
    if (
      !manager &&
      !(
        (task.status === 'TODO' && status === 'IN_PROGRESS') ||
        (task.status === 'IN_PROGRESS' && status === 'IN_REVIEW')
      )
    ) {
      toast.error('Move tasks from To do → In progress → In review.');
      return;
    }
    mutation.mutate({ id: task.id, status, expectedStatus: task.status });
  }
  return (
    <div className={embedded ? '' : 'page !max-w-none'}>
      {!embedded && (
        <PageHeader
          eyebrow="All work, one place"
          title="Creative board"
          description="From the first idea to the final approval. Keep every handoff in view."
          action={<NewTaskButton />}
        />
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 border-b-2 border-accent pb-3 text-xs">
            <SlidersHorizontal size={13} />
            Board
            <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">
              {query.tasks.length}
            </span>
          </div>
          <span className="pb-3 text-[11px] text-muted">All work, one place</span>
        </div>
        <SearchField />
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {!embedded && (
          <select
            aria-label="Filter by project"
            className="h-8 w-auto max-w-[210px] py-0 text-[11px]"
            value={filters.projectId}
            onChange={(e) => filters.setFilter('projectId', e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter by department"
          className="h-8 w-auto py-0 text-[11px]"
          value={filters.departmentId}
          onChange={(e) => filters.setFilter('departmentId', e.target.value)}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          className="h-8 w-auto py-0 text-[11px]"
          value={filters.priority}
          onChange={(e) => filters.setFilter('priority', e.target.value)}
        >
          <option value="">Priority</option>
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="Filter by deadline"
          className="h-8 w-auto py-0 text-[11px]"
          value={filters.deadline}
          onChange={(e) => filters.setFilter('deadline', e.target.value)}
        >
          <option value="">Any deadline</option>
          <option value="today">Due by today</option>
          <option value="week">Next 7 days + overdue</option>
        </select>
        {(filters.departmentId || filters.priority || filters.deadline || filters.search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              for (const key of ['departmentId', 'priority', 'deadline', 'search'] as const)
                filters.setFilter(key, '');
            }}
          >
            Clear
          </Button>
        )}
        <span className="ml-auto hidden items-center gap-1 text-[10px] text-muted lg:flex">
          <ArrowUpRight size={12} />
          Open any card to see the full story
        </span>
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActive(query.tasks.find((t) => t.id === e.active.id) ?? null)}
          onDragCancel={() => setActive(null)}
          onDragEnd={drop}
        >
          <div className="flex gap-3 overflow-x-auto pb-8">
            {statuses.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={query.tasks.filter((t) => t.status === status)}
              />
            ))}
          </div>
          <DragOverlay>
            {active ? (
              <div className="w-[232px]">
                <Card task={active} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      <p className="mt-2 text-[10px] text-muted">
        Drag with the card handle, or open a task to change its status. Keyboard: focus the handle,
        press Space, then use arrow keys.
      </p>
    </div>
  );
}

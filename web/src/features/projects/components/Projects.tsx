import { useState, useEffect, type FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Plus, ArrowUpRight, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useProjects, useProject } from '../hooks/useProjects';
import { projectsApi } from '../api';
import type { Project, ProjectInput } from '../types';
import { useAuth } from '../../../stores/auth';
import { useUI } from '../../../stores/ui';
import { Button } from '../../../components/ui/button';
import { Sheet } from '../../../components/ui/sheet';
import { PageHeader, Loading, ErrorState, Empty } from '../../../components/shared';
import { shortDate, inputDate, label } from '../../../lib/utils';
import { invalidateWorkspace, queryClient } from '../../../api/query';
import { errorMessage } from '../../../api/client';
import { Board } from '../../kanban/components/Board';
import { NewTaskButton } from '../../../app/Layout';
import { Files } from '../../files/components/Files';
function ProjectForm({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={project ? 'Edit project' : 'Create a project'}
      description="A shared brief keeps every department moving together."
    >
      {open && <ProjectFields project={project} onClose={onClose} />}
    </Sheet>
  );
}
function ProjectFields({ project, onClose }: { project?: Project; onClose: () => void }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: (input: ProjectInput) =>
      project ? projectsApi.update(project.id, input) : projectsApi.create(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const old = queryClient.getQueryData<Project[]>(['projects']);
      const next: Project = {
        ...input,
        id: project?.id ?? 'pending-project',
        status: input.status ?? 'ACTIVE',
        tasks: project?.tasks ?? [],
        _count: project?._count ?? { tasks: 0 },
      };
      queryClient.setQueryData<Project[]>(['projects'], (data) =>
        project ? data?.map((p) => (p.id === project.id ? next : p)) : [next, ...(data ?? [])],
      );
      return old;
    },
    onSuccess: (p) => {
      onClose();
      toast.success(project ? 'Project updated' : 'Project created');
      if (!project) navigate(`/projects/${p.id}`);
    },
    onError: (e, _input, old) => {
      queryClient.setQueryData(['projects'], old);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateWorkspace(),
  });
  const remove = useMutation({
    mutationFn: () => projectsApi.remove(project!.id),
    onSuccess: () => {
      onClose();
      navigate('/projects');
      toast.success('Project deleted');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => invalidateWorkspace(),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      name: String(form.get('name')),
      clientName: String(form.get('clientName')),
      brief: String(form.get('brief')),
      deadline: new Date(String(form.get('deadline'))).toISOString(),
      status: String(form.get('status') ?? 'ACTIVE') as ProjectInput['status'],
    });
  }
  return (
    <form className="space-y-5 p-6" onSubmit={submit}>
      <label className="field">
        Project name
        <input
          name="name"
          required
          maxLength={200}
          autoFocus
          defaultValue={project?.name}
          placeholder="e.g. Summer campaign"
        />
      </label>
      <label className="field">
        Client name
        <input
          name="clientName"
          required
          maxLength={200}
          defaultValue={project?.clientName}
          placeholder="A name, not another account"
        />
      </label>
      <label className="field">
        Brief
        <textarea
          name="brief"
          rows={6}
          maxLength={30000}
          defaultValue={project?.brief}
          placeholder="The goal, the audience, and the big idea."
        />
      </label>
      <label className="field">
        Deadline
        <input
          name="deadline"
          type="datetime-local"
          required
          defaultValue={inputDate(
            project?.deadline ?? new Date(Date.now() + 7 * 86400000).toISOString(),
          )}
        />
      </label>
      {project && (
        <label className="field">
          Status
          <select name="status" defaultValue={project.status}>
            {['ACTIVE', 'COMPLETED', 'ARCHIVED'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
      <Button disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : project ? 'Save project' : 'Create project'}
      </Button>
      {project && (
        <div className="border-t border-border pt-6">
          {confirm ? (
            <>
              <p className="mb-3 text-xs text-danger">
                Delete this project, all its tasks, comments, and files permanently?
              </p>
              <Button
                type="button"
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Delete permanently
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setConfirm(true)}>
              Delete project
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
export function Projects() {
  const query = useProjects();
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  const [create, setCreate] = useState(false);
  const [filter, setFilter] = useState('ACTIVE');
  return (
    <div className="page">
      <PageHeader
        eyebrow="From brief to brilliant"
        title="Projects"
        description="Big ideas, broken into work your team can move forward."
        action={
          manager && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={14} />
              New project
            </Button>
          )
        }
      />
      <div className="mb-6 flex gap-2">
        {['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ALL'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'outline' : 'ghost'}
            onClick={() => setFilter(s)}
          >
            {label(s)}
          </Button>
        ))}
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data
            ?.filter((p) => filter === 'ALL' || p.status === filter)
            .map((p) => {
              const done = p.tasks.filter((t) => t.status === 'APPROVED').length;
              const departments = [...new Set(p.tasks.map((t) => t.department.name))];
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  onClick={() => useUI.getState().setFilter('projectId', p.id)}
                  className="panel group overflow-hidden p-6 transition hover:-translate-y-0.5 hover:border-accent/50"
                >
                  <div
                    className="project-cover"
                    data-tone={
                      ['cyan', 'amber', 'violet'][
                        [...p.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3
                      ]
                    }
                  >
                    <span>{p.clientName.trim().slice(0, 1).toUpperCase()}</span>
                    <ArrowUpRight size={18} className="absolute right-4 top-4 opacity-70" />
                  </div>
                  <span className="mb-3 inline-flex text-[10px] font-medium text-success">
                    {label(p.status)}
                  </span>
                  <p className="eyebrow mb-2">{p.clientName}</p>
                  <h2 className="font-medium tracking-tight">{p.name}</h2>
                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted">
                    {p.brief || 'A new project, ready for a clear brief.'}
                  </p>
                  <div className="mb-5 mt-4 flex flex-wrap gap-1.5">
                    {departments.map((d) => (
                      <span key={d} className="badge">
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>
                      {done} of {p.tasks.length} approved
                    </span>
                    <span>{p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0}%</span>
                  </div>
                  <div className="progress-track mb-5 mt-2">
                    <div
                      className="progress-fill"
                      style={{ width: `${p.tasks.length ? (done / p.tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between border-t border-border pt-4 text-[10px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={11} />
                      {shortDate(p.deadline)}
                    </span>
                    <span>{label(p.status)}</span>
                  </div>
                </Link>
              );
            })}
        </div>
      )}
      {query.data && !query.data.some((p) => filter === 'ALL' || p.status === filter) && (
        <Empty
          title="A blank canvas"
          body={
            manager
              ? 'Create a project, add a brief, then turn the work into tasks for your departments.'
              : 'Your projects will appear here when your department receives its first task.'
          }
          action={manager && <Button onClick={() => setCreate(true)}>Create a project</Button>}
        />
      )}
      <ProjectForm open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
export function ProjectDetail() {
  const { id = '' } = useParams();
  const query = useProject(id);
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('board');
  useEffect(() => {
    useUI.getState().setFilter('projectId', id);
    return () => useUI.getState().setFilter('projectId', '');
  }, [id]);
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState retry={() => void query.refetch()} />;
  const p = query.data!;
  return (
    <div className="page !max-w-none">
      <Link to="/projects" className="mb-5 inline-block text-xs text-muted">
        ← All projects
      </Link>
      <PageHeader
        eyebrow={p.clientName}
        title={p.name}
        description={`${label(p.status)} · Due ${shortDate(p.deadline)} · ${p.tasks.length} tasks`}
        action={
          <div className="flex gap-2">
            {manager && (
              <Button variant="outline" onClick={() => setEdit(true)}>
                Edit project
              </Button>
            )}
            <NewTaskButton />
          </div>
        }
      />
      <div className="mb-6 flex gap-2">
        {['board', 'brief & files'].map((t) => (
          <Button key={t} variant={tab === t ? 'outline' : 'ghost'} onClick={() => setTab(t)}>
            {label(t)}
          </Button>
        ))}
      </div>
      {tab === 'board' ? (
        <Board embedded />
      ) : (
        <div className="max-w-3xl space-y-8">
          <section className="panel p-6">
            <h2 className="section-title mb-4">Project brief</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted">
              {p.brief || 'The manager can add the brief here to give the team a clear direction.'}
            </p>
          </section>
          <Files projectId={p.id} />
        </div>
      )}
      <ProjectForm open={edit} onClose={() => setEdit(false)} project={p} />
    </div>
  );
}

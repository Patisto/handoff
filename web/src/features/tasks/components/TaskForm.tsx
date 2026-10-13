import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sheet } from '../../../components/ui/sheet';
import { Button } from '../../../components/ui/button';
import { useUI } from '../../../stores/ui';
import { useProjects } from '../../projects/hooks/useProjects';
import { useDirectory } from '../../admin/hooks/useDirectory';
import { tasksApi } from '../api';
import { errorMessage } from '../../../api/client';
import { invalidateWorkspace, queryClient } from '../../../api/query';
import { priorities, type Priority, type Task } from '../../../lib/types';
import { inputDate, label } from '../../../lib/utils';
export function TaskForm() {
  const open = useUI((s) => s.createTask);
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => useUI.getState().setCreateTask(v)}
      title="Create a task"
      description="Give the work a clear owner and a next step."
    >
      {open && <Form />}
    </Sheet>
  );
}
function Form() {
  const { data: projects = [] } = useProjects();
  const { departments, users } = useDirectory();
  const [department, setDepartment] = useState('');
  const [assignee, setAssignee] = useState('');
  const [project, setProject] = useState(useUI.getState().projectId);
  const mutation = useMutation({
    mutationFn: tasksApi.create,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] });
      const p = projects.find((p) => p.id === input.projectId)!;
      const d = departments.find((d) => d.id === input.departmentId)!;
      const person = users.find((u) => u.id === input.assigneeId);
      const optimistic: Task = {
        ...input,
        id: 'pending-task',
        project: p,
        department: d,
        assignee: person ?? null,
        status: 'TODO',
        rejectionReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { files: 0, comments: 0 },
      };
      queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
        old ? [optimistic, ...old] : old,
      );
      return snapshots;
    },
    onSuccess: (task) => {
      useUI.getState().setCreateTask(false);
      useUI.getState().openTask(task.id);
      toast.success('Task created');
    },
    onError: (e, _v, snapshots) => {
      snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateWorkspace(),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      title: String(form.get('title')),
      description: String(form.get('description')),
      projectId: project,
      departmentId: department,
      assigneeId: assignee || null,
      priority: String(form.get('priority')) as Priority,
      deadline: new Date(String(form.get('deadline'))).toISOString(),
    });
  }
  return (
    <form onSubmit={submit} className="space-y-5 p-6">
      <label className="field">
        Task title
        <input
          name="title"
          required
          maxLength={200}
          autoFocus
          placeholder="What needs to happen?"
        />
      </label>
      <label className="field">
        Project
        <select required value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">Select a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Description
        <textarea
          name="description"
          rows={4}
          placeholder="Context, deliverables, and what good looks like."
          maxLength={20000}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="field">
          Department
          <select
            required
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setAssignee('');
            }}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Assignee
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            disabled={!department}
          >
            <option value="">Department queue</option>
            {users
              .filter((u) => u.active && u.departments.some((d) => d.departmentId === department))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="field">
          Priority
          <select name="priority" defaultValue="NORMAL">
            {priorities.map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Deadline
          <input
            name="deadline"
            type="datetime-local"
            required
            defaultValue={inputDate(new Date(Date.now() + 86400000).toISOString())}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={() => useUI.getState().setCreateTask(false)}>
          Cancel
        </Button>
        <Button disabled={mutation.isPending || !projects.length || !departments.length}>
          {mutation.isPending ? 'Creating…' : 'Create task'}
        </Button>
      </div>
      {!projects.length && (
        <p className="text-xs text-muted">Create a project first from the Projects page.</p>
      )}
    </form>
  );
}

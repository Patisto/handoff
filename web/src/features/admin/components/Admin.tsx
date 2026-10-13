import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Users, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useDirectory } from '../hooks/useDirectory';
import type { User, Department } from '../types';
import { useAuth } from '../../../stores/auth';
import { Button } from '../../../components/ui/button';
import { Sheet } from '../../../components/ui/sheet';
import { Avatar, PageHeader, Loading, ErrorState, Empty } from '../../../components/shared';
import { post, patch, errorMessage } from '../../../api/client';
import { queryClient, invalidateWorkspace } from '../../../api/query';
export function Admin() {
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  const directory = useDirectory();
  const [tab, setTab] = useState<'people' | 'departments'>('people');
  const [editingUser, setEditingUser] = useState<User | null | undefined>(undefined);
  const [editingDepartment, setEditingDepartment] = useState<Department | null | undefined>(
    undefined,
  );
  if (!manager) return <Navigate to="/board" replace />;
  return (
    <div className="page max-w-6xl">
      <PageHeader
        eyebrow="Good teams, clear ownership"
        title="People & departments"
        description="Give everyone a place to do their best work."
        action={
          <Button
            onClick={() => (tab === 'people' ? setEditingUser(null) : setEditingDepartment(null))}
          >
            <Plus size={14} />
            {tab === 'people' ? 'Add person' : 'Add department'}
          </Button>
        }
      />
      <div className="mb-6 flex gap-2">
        <Button variant={tab === 'people' ? 'outline' : 'ghost'} onClick={() => setTab('people')}>
          People <span className="text-muted">{directory.users.length}</span>
        </Button>
        <Button
          variant={tab === 'departments' ? 'outline' : 'ghost'}
          onClick={() => setTab('departments')}
        >
          Departments <span className="text-muted">{directory.departments.length}</span>
        </Button>
      </div>
      {directory.isLoading ? (
        <Loading />
      ) : directory.isError ? (
        <ErrorState retry={() => void queryClient.invalidateQueries()} />
      ) : tab === 'people' ? (
        <div className="panel divide-y divide-border">
          {directory.users.map((user) => (
            <button
              key={user.id}
              onClick={() => setEditingUser(user)}
              className="flex w-full items-center gap-3 p-5 text-left hover:bg-raised/50"
            >
              <Avatar name={user.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">
                  {user.name} {!user.active && <span className="ml-2 text-danger">Inactive</span>}
                </p>
                <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
              </div>
              <span className="hidden text-xs text-muted sm:block">
                {user.departments.map((d) => d.department.name).join(', ') || 'No department'}
              </span>
              <span className="badge">{user.role === 'MANAGER' ? 'Manager' : 'Member'}</span>
              <ArrowUpRight size={13} className="text-muted" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directory.departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setEditingDepartment(d)}
              className="panel p-6 text-left hover:border-accent/50"
            >
              <Users size={22} className="mb-6 text-accent" />
              <h2 className="font-medium">{d.name}</h2>
              <p className="mt-2 text-xs text-muted">{d.users?.length ?? 0} people</p>
              <div className="mt-5 flex -space-x-1">
                {d.users?.slice(0, 6).map((m) => (
                  <Avatar key={m.userId} name={m.user.name} />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
      {!directory.isLoading && tab === 'people' && !directory.users.length && (
        <Empty
          title="Build your team"
          body="Add your first person and assign them to a department."
        />
      )}
      <Sheet
        open={editingUser !== undefined}
        onOpenChange={(v) => {
          if (!v) setEditingUser(undefined);
        }}
        title={editingUser ? 'Edit person' : 'Add a person'}
      >
        {editingUser !== undefined && (
          <UserForm
            key={editingUser?.id ?? 'new'}
            user={editingUser}
            departments={directory.departments}
            onClose={() => setEditingUser(undefined)}
          />
        )}
      </Sheet>
      <Sheet
        open={editingDepartment !== undefined}
        onOpenChange={(v) => {
          if (!v) setEditingDepartment(undefined);
        }}
        title={editingDepartment ? 'Edit department' : 'Add a department'}
      >
        {editingDepartment !== undefined && (
          <DepartmentForm
            key={editingDepartment?.id ?? 'new'}
            department={editingDepartment}
            users={directory.users}
            onClose={() => setEditingDepartment(undefined)}
          />
        )}
      </Sheet>
    </div>
  );
}
async function refreshDirectory() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['users'] }),
    queryClient.invalidateQueries({ queryKey: ['departments'] }),
    invalidateWorkspace(),
  ]);
}
function UserForm({
  user,
  departments,
  onClose,
}: {
  user: User | null;
  departments: Department[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(user?.departments.map((d) => d.departmentId) ?? []);
  const mutation = useMutation({
    mutationFn: async (input: object) =>
      user ? patch(`/users/${user.id}`, input) : post('/users', input),
    onSuccess: () => {
      onClose();
      toast.success('Person saved');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refreshDirectory,
  });
  const deactivate = useMutation({
    mutationFn: () => patch(`/users/${user!.id}/deactivate`),
    onSuccess: () => {
      onClose();
      toast.success('Account deactivated');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refreshDirectory,
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    mutation.mutate({
      name: String(f.get('name')),
      email: String(f.get('email')),
      role: String(f.get('role')),
      departmentIds: selected,
      ...(password ? { password } : {}),
    });
  }
  return (
    <form onSubmit={submit} className="space-y-5 p-6">
      <label className="field">
        Name
        <input required name="name" maxLength={200} defaultValue={user?.name} />
      </label>
      <label className="field">
        Email
        <input required name="email" type="email" defaultValue={user?.email} />
      </label>
      <label className="field">
        {user ? 'New password (leave blank to keep current)' : 'Initial password'}
        <input
          name="password"
          type="password"
          required={!user}
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label className="field">
        Role
        <select name="role" defaultValue={user?.role ?? 'MEMBER'}>
          <option value="MEMBER">Member</option>
          <option value="MANAGER">Manager</option>
        </select>
      </label>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-xs text-muted">Departments</legend>
        {departments.map((d) => (
          <label key={d.id} className="flex items-center gap-3 text-xs">
            <input
              className="h-4 w-4 accent-accent"
              type="checkbox"
              checked={selected.includes(d.id)}
              onChange={(e) =>
                setSelected((old) =>
                  e.target.checked ? [...old, d.id] : old.filter((id) => id !== d.id),
                )
              }
            />
            {d.name}
          </label>
        ))}
      </fieldset>
      <Button disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save person'}
      </Button>
      {user?.active && (
        <div className="border-t border-border pt-5">
          <p className="mb-3 text-xs text-muted">
            Deactivating ends their sessions and removes active assignments.
          </p>
          <Button
            type="button"
            disabled={deactivate.isPending}
            variant="destructive"
            onClick={() => deactivate.mutate()}
          >
            Deactivate account
          </Button>
        </div>
      )}
    </form>
  );
}
function DepartmentForm({
  department,
  users,
  onClose,
}: {
  department: Department | null;
  users: User[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(department?.users?.map((u) => u.userId) ?? []);
  const mutation = useMutation({
    mutationFn: async (name: string) => {
      const result = department
        ? await patch<Department>(`/departments/${department.id}`, { name })
        : await post<Department>('/departments', { name });
      await post(`/departments/${result.id}/users`, { userIds: selected });
    },
    onSuccess: () => {
      onClose();
      toast.success('Department saved');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refreshDirectory,
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(String(new FormData(e.currentTarget).get('name')));
      }}
      className="space-y-5 p-6"
    >
      <label className="field">
        Department name
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={department?.name}
          placeholder="e.g. Strategy"
        />
      </label>
      <fieldset>
        <legend className="mb-4 text-xs text-muted">Team members</legend>
        <div className="space-y-4">
          {users
            .filter((u) => u.active)
            .map((u) => (
              <label key={u.id} className="flex items-center gap-3 text-xs">
                <input
                  className="h-4 w-4 accent-accent"
                  type="checkbox"
                  checked={selected.includes(u.id)}
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked ? [...old, u.id] : old.filter((id) => id !== u.id),
                    )
                  }
                />
                <Avatar name={u.name} />
                {u.name}
              </label>
            ))}
        </div>
      </fieldset>
      <Button disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save department'}
      </Button>
    </form>
  );
}

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  LayoutDashboard,
  Columns3,
  FolderClosed,
  Users,
  Layers,
  Plus,
  Search,
  LogOut,
  Menu,
  ChevronDown,
  Command,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../stores/auth';
import { useUI } from '../stores/ui';
import { signOut } from '../features/auth/api';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useRealtime } from '../hooks/useRealtime';
import { queryClient } from '../api/query';
import { Button } from '../components/ui/button';
import { Sheet } from '../components/ui/sheet';
import { Avatar } from '../components/shared';
import { TaskDrawer } from '../features/tasks/components/TaskDrawer';
import { TaskForm } from '../features/tasks/components/TaskForm';
import { cn } from '../lib/utils';
import { errorMessage } from '../api/client';
import { removePushDevice } from '../features/notifications/push';
const navigation = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/board', icon: Columns3, label: 'Task board' },
  { to: '/projects', icon: FolderClosed, label: 'Projects' },
  { to: '/notifications', icon: Bell, label: 'Inbox' },
];
export function Layout() {
  const user = useAuth((s) => s.user)!;
  const ui = useUI();
  const [menu, setMenu] = useState(false);
  const connected = useRealtime();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const location = useLocation();
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('workspace-search')?.focus();
      }
      if (
        e.key === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !(e.target as HTMLElement).closest('input,textarea,select,[contenteditable]') &&
        user.role === 'MANAGER' &&
        !ui.taskId &&
        !ui.createTask
      )
        ui.setCreateTask(true);
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [user.role, ui]);
  async function logout() {
    try {
      await removePushDevice();
      await signOut();
      queryClient.clear();
      useUI.getState().reset();
      useAuth.getState().clear();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const sidebar = (
    <>
      <div className="flex h-[76px] items-center gap-2.5 px-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <Layers size={17} />
        </span>
        <span className="text-lg font-semibold tracking-tight">
          handoff<span className="text-accent">.</span>
        </span>
      </div>
      <div className="mx-3 mb-7 flex items-center gap-3 rounded-lg border border-border bg-[#1c1c20] p-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-[#292832] text-xs">
          S
        </span>
        <div className="flex-1">
          <p className="text-xs font-medium">Studio workspace</p>
          <p className="mt-0.5 text-[10px] text-muted">
            {user.role === 'MANAGER' ? 'Manager' : 'Team member'}
          </p>
        </div>
        <ChevronDown size={13} className="text-muted" />
      </div>
      <p className="eyebrow mb-3 px-6">Workspace</p>
      <nav className="space-y-1 px-3">
        {navigation.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMenu(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition',
                isActive
                  ? 'bg-[#8b7af0]/10 text-[#b7aafa]'
                  : 'text-muted hover:bg-white/5 hover:text-foreground',
              )
            }
          >
            <Icon size={16} strokeWidth={1.6} />
            {label}
            {to === '/notifications' && unread > 0 && (
              <span className="ml-auto rounded bg-accent/15 px-1.5 text-[10px] text-accent">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      {user.role === 'MANAGER' && (
        <>
          <p className="eyebrow mb-3 mt-8 px-6">Manage</p>
          <NavLink
            onClick={() => setMenu(false)}
            to="/admin"
            className={({ isActive }) =>
              cn(
                'mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs',
                isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-white/5',
              )
            }
          >
            <Users size={16} strokeWidth={1.6} />
            People & departments
          </NavLink>
        </>
      )}
      <div className="mt-auto p-4">
        <div className="mb-5 rounded-lg border border-dashed border-border p-3">
          <p className="text-[11px] font-medium">A little less back-and-forth.</p>
          <p className="mt-1.5 text-[10px] leading-5 text-muted">
            Keep feedback on the task.
            <br />
            Your future self will thank you.
          </p>
        </div>
        <div className="flex items-center gap-2.5 border-t border-border pt-4">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs">{user.name}</p>
            <p className="text-[10px] text-muted">
              {user.role === 'MANAGER'
                ? 'Workspace manager'
                : user.departments.map((d) => d.department.name).join(', ') || 'Team member'}
            </p>
          </div>
          <Button
            title="Sign out"
            aria-label="Sign out"
            onClick={() => void logout()}
            variant="ghost"
            size="icon"
          >
            <LogOut size={14} />
          </Button>
        </div>
      </div>
    </>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-[218px] flex-col border-r border-border bg-[#141416] md:flex">
        {sidebar}
      </aside>
      <div className="min-w-0 flex-1 md:ml-[218px]">
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Button
              className="md:hidden"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={18} />
            </Button>
            <span className="hidden text-xs text-muted lg:inline">Workspace</span>
            <span className="hidden text-border lg:inline">/</span>
            <span className="text-xs">
              {navigation.find((n) => location.pathname.startsWith(n.to))?.label ??
                'People & departments'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span
              title={connected ? 'Live updates connected' : 'Reconnecting to live updates'}
              className="hidden items-center gap-1.5 text-[10px] text-muted sm:flex"
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  connected ? 'bg-accent' : 'bg-muted animate-pulse',
                )}
              />
              {connected ? 'Live' : 'Connecting'}
            </span>
            <NavLink
              to="/notifications"
              className="relative p-2 text-muted"
              aria-label={`Inbox, ${unread} unread`}
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </NavLink>
            <Avatar name={user.name} />
          </div>
        </header>
        <Outlet />
      </div>
      <Sheet open={menu} onOpenChange={setMenu} title="Workspace navigation">
        <div className="flex min-h-full flex-col">{sidebar}</div>
      </Sheet>
      <TaskDrawer />
      <TaskForm />
      <div className="pointer-events-none fixed bottom-3 right-4 hidden gap-2 text-[10px] text-[#56565f] xl:flex">
        <Command size={12} />K to search<span>·</span>
        {user.role === 'MANAGER' ? 'N to create a task' : 'Made for focused work'}
      </div>
    </div>
  );
}
export function NewTaskButton() {
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  return manager ? (
    <Button onClick={() => useUI.getState().setCreateTask(true)}>
      <Plus size={15} />
      New task
      <span className="ml-2 hidden rounded border border-white/20 px-1 text-[9px] text-white/60 sm:inline">
        N
      </span>
    </Button>
  ) : null;
}
export function SearchField() {
  const search = useUI((s) => s.search);
  return (
    <div className="relative w-full sm:w-[220px]">
      <Search className="absolute left-3 top-2.5 text-muted" size={14} />
      <input
        id="workspace-search"
        className="h-9 pl-9 text-xs"
        placeholder="Search tasks…"
        aria-label="Search tasks"
        value={search}
        onChange={(e) => useUI.getState().setFilter('search', e.target.value)}
      />
    </div>
  );
}

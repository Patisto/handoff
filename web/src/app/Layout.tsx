import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Command,
  X,
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
import { ThemeToggle } from '../components/ThemeToggle';
import { TaskDrawer } from '../features/tasks/components/TaskDrawer';
import { TaskForm } from '../features/tasks/components/TaskForm';
import { cn } from '../lib/utils';
import { errorMessage } from '../api/client';
import { removePushDevice } from '../features/notifications/push';
const navigation = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/projects', icon: FolderClosed, label: 'Projects' },
  { to: '/board', icon: Columns3, label: 'Task board' },
  { to: '/notifications', icon: Bell, label: 'Inbox' },
];
export function Layout() {
  const user = useAuth((s) => s.user)!;
  const ui = useUI();
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const connected = useRealtime();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const location = useLocation();
  const navigate = useNavigate();
  const links =
    user.role === 'MANAGER'
      ? [...navigation, { to: '/admin', icon: Users, label: 'Team & departments' }]
      : navigation;
  const page = links.find((n) => location.pathname.startsWith(n.to))?.label ?? 'Workspace';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (
        e.key === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !(e.target as HTMLElement).closest('input,textarea,select,[contenteditable]') &&
        user.role === 'MANAGER' &&
        !document.querySelector('[role="dialog"]')
      )
        useUI.getState().setCreateTask(true);
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [user.role]);
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
  return (
    <div className="workspace-app">
      <a
        href="#workspace-content"
        className="sr-only fixed left-24 top-3 z-50 rounded bg-panel p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      <aside className="workspace-rail" aria-label="Workspace sidebar">
        <Link to="/dashboard" className="rail-brand" aria-label="Handoff overview">
          <span className="brand-mark">
            <Layers size={21} />
          </span>
          <span className="rail-label">
            Handoff<span className="text-accent">.</span>
          </span>
        </Link>
        <nav className="rail-nav" aria-label="Main navigation">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) => cn('rail-link', isActive && 'active')}
            >
              <Icon strokeWidth={1.7} />
              <span className="rail-label">{label}</span>
              {to === '/notifications' && unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="rail-footer">
          <button
            type="button"
            className="rail-link"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => void logout()}
          >
            <LogOut />
            <span className="rail-label">Sign out</span>
          </button>
          <div className="rail-profile">
            <Avatar name={user.name} size="lg" />
            <div className="rail-label">
              <p className="text-xs font-medium">{user.name}</p>
              <p className="mt-1 text-[10px] text-muted">
                {user.role === 'MANAGER'
                  ? 'Workspace manager'
                  : user.departments.map((d) => d.department.name).join(', ') || 'Team member'}
              </p>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="header-action md:hidden"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="eyebrow mb-1.5">Handoff / Workspace</p>
              <p className="font-display text-lg font-medium tracking-tight sm:text-2xl">
                {location.pathname === '/dashboard'
                  ? `${greeting}, ${user.name.split(' ')[0]}.`
                  : page}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span
              title={connected ? 'Live updates connected' : 'Reconnecting to live updates'}
              className="mr-2 hidden items-center gap-1.5 text-[10px] text-muted lg:flex"
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  connected ? 'bg-success' : 'bg-warning animate-pulse',
                )}
              />
              {connected ? 'Live workspace' : 'Connecting'}
            </span>
            <ThemeToggle />
            <button
              type="button"
              className="header-action"
              aria-label={searchOpen ? 'Close task search' : 'Search tasks'}
              title="Search tasks (Ctrl/Cmd+K)"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
            <NavLink
              to="/notifications"
              className="header-action"
              aria-label={`Inbox, ${unread} unread`}
              title="Inbox"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-warning" />
              )}
            </NavLink>
            <span className="ml-1 hidden sm:inline-flex">
              <Avatar name={user.name} size="lg" />
            </span>
          </div>
          {searchOpen && (
            <form
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-panel px-3 py-1"
              onSubmit={(e) => {
                e.preventDefault();
                navigate('/board');
                setSearchOpen(false);
              }}
            >
              <Search size={16} className="shrink-0 text-muted" />
              <input
                autoFocus
                aria-label="Search all visible tasks"
                placeholder="Search tasks by title, project, or assignee…"
                value={ui.search}
                onChange={(e) => ui.setFilter('search', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                className="border-0 bg-transparent focus:ring-0"
              />
              <Button type="submit" variant="ghost" size="sm">
                Search board
              </Button>
            </form>
          )}
        </header>
        <main id="workspace-content" tabIndex={-1} className="outline-none">
          <Outlet />
        </main>
      </div>
      <nav className="mobile-dock" aria-label="Mobile navigation">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) => cn('dock-link', isActive && 'active')}
          >
            <Icon size={19} />
            <span>{to === '/admin' ? 'Team' : to === '/board' ? 'Board' : label}</span>
            {to === '/notifications' && unread > 0 && (
              <span className="absolute right-3 top-1 h-1.5 w-1.5 rounded-full bg-warning" />
            )}
          </NavLink>
        ))}
      </nav>
      <Sheet open={menu} onOpenChange={setMenu} title="Your workspace">
        <div className="p-5">
          <div className="mb-6 flex items-center gap-3">
            <Avatar name={user.name} size="lg" />
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="mt-1 text-xs text-muted">
                {user.role === 'MANAGER'
                  ? 'Manager'
                  : user.departments.map((d) => d.department.name).join(', ') || 'Member'}
              </p>
            </div>
          </div>
          <nav className="space-y-2" aria-label="Workspace menu">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenu(false)}
                className={({ isActive }) => cn('rail-link', isActive && 'active')}
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
          <Button className="mt-8" variant="outline" onClick={() => void logout()}>
            <LogOut size={15} />
            Sign out
          </Button>
        </div>
      </Sheet>
      <TaskDrawer />
      <TaskForm />
      <div className="pointer-events-none fixed bottom-3 right-4 hidden gap-2 text-[10px] text-muted xl:flex">
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
      <span className="ml-2 hidden rounded border border-current/20 px-1 text-[9px] opacity-70 sm:inline">
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

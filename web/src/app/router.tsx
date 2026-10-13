import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { useSession } from '../features/auth/hooks/useSession';
import { Login } from '../features/auth/components/Login';
import { Layout } from './Layout';
const Board = lazy(() =>
  import('../features/kanban/components/Board').then((m) => ({ default: m.Board })),
);
const Dashboard = lazy(() =>
  import('../features/dashboard/components/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const Projects = lazy(() =>
  import('../features/projects/components/Projects').then((m) => ({ default: m.Projects })),
);
const ProjectDetail = lazy(() =>
  import('../features/projects/components/Projects').then((m) => ({ default: m.ProjectDetail })),
);
const Notifications = lazy(() =>
  import('../features/notifications/components/Notifications').then((m) => ({
    default: m.Notifications,
  })),
);
const Admin = lazy(() =>
  import('../features/admin/components/Admin').then((m) => ({ default: m.Admin })),
);
import { Loading } from '../components/shared';
function Protected() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
export function Router() {
  useSession();
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/board" replace />} />
              <Route path="board" element={<Board />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

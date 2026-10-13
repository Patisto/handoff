import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../stores/auth';
import { getDashboard } from '../api';
export function useDashboard() {
  const manager = useAuth((s) => s.user?.role === 'MANAGER');
  return useQuery({ queryKey: ['dashboard', manager], queryFn: () => getDashboard(manager) });
}

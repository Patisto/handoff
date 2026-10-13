import { useQuery } from '@tanstack/react-query';
import { getUsers, getDepartments } from '../api';
import { useAuth } from '../../../stores/auth';
export function useDirectory() {
  const user = useAuth((s) => s.user);
  const manager = user?.role === 'MANAGER';
  const users = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: manager });
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: manager,
  });
  return {
    users: users.data ?? [],
    departments: manager
      ? (departments.data ?? [])
      : (user?.departments.map((d) => d.department) ?? []),
    isLoading: manager && (users.isLoading || departments.isLoading),
    isError: users.isError || departments.isError,
  };
}

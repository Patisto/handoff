import { useTasks } from '../../tasks/hooks/useTasks';
import { useUI } from '../../../stores/ui';
export function useBoard() {
  const filters = useUI();
  const query = useTasks({
    projectId: filters.projectId || undefined,
    departmentId: filters.departmentId || undefined,
    priority: filters.priority || undefined,
    deadline: filters.deadline
      ? new Date(
          filters.deadline === 'today'
            ? new Date().setHours(23, 59, 59, 999)
            : Date.now() + 7 * 86400000,
        ).toISOString()
      : undefined,
  });
  return {
    ...query,
    tasks: (query.data ?? []).filter((t) =>
      `${t.title} ${t.project.name} ${t.assignee?.name ?? ''}`
        .toLowerCase()
        .includes(filters.search.toLowerCase()),
    ),
  };
}

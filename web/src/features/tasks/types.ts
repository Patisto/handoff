export type { Task, Status, Priority } from '../../lib/types';
import type { Priority } from '../../lib/types';
export type TaskInput = {
  title: string;
  description: string;
  projectId: string;
  departmentId: string;
  assigneeId: string | null;
  priority: Priority;
  deadline: string;
};

export type Role = 'MANAGER' | 'MEMBER';
export type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type Department = {
  id: string;
  name: string;
  users?: { userId: string; user: { id: string; name: string; active: boolean } }[];
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  departments: { departmentId: string; department: Department }[];
};
export type Task = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project: { id: string; name: string; clientName: string };
  departmentId: string;
  department: Department;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  priority: Priority;
  status: Status;
  deadline: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number; files: number };
};
export type Project = {
  id: string;
  name: string;
  clientName: string;
  brief: string;
  deadline: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  tasks: { id: string; status: Status; department: Department }[];
  _count: { tasks: number };
};
export type Comment = {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
};
export type UploadedFile = {
  id: string;
  taskId: string | null;
  projectId: string | null;
  originalName: string;
  size: number;
  version: number;
  createdAt: string;
};
export type Notification = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  payload: { title: string; body: string; taskId?: string; projectId?: string };
};
export type Activity = {
  id: string;
  taskId: string | null;
  projectId: string | null;
  action: string;
  createdAt: string;
  actor: { id: string; name: string };
  meta: { from?: string; to?: string; reason?: string; name?: string };
};
export type Dashboard = {
  counts: { total: number; inReview: number; overdue: number; approved: number };
  reviewQueue: Task[];
  dueToday: Task[];
  myTasks: Task[];
  rejected: Task[];
  dueSoon: Task[];
  overdueTasks: Task[];
};
export const statuses: Status[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'REJECTED'];
export const priorities: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

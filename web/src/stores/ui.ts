import { create } from 'zustand';
type UI = {
  taskId: string | null;
  createTask: boolean;
  projectId: string;
  search: string;
  departmentId: string;
  priority: string;
  deadline: string;
  openTask: (id: string | null) => void;
  setCreateTask: (value: boolean) => void;
  setFilter: (
    key: 'projectId' | 'search' | 'departmentId' | 'priority' | 'deadline',
    value: string,
  ) => void;
  reset: () => void;
};
export const useUI = create<UI>((set) => ({
  taskId: null,
  createTask: false,
  projectId: '',
  search: '',
  departmentId: '',
  priority: '',
  deadline: '',
  openTask: (taskId) => set({ taskId }),
  setCreateTask: (createTask) => set({ createTask }),
  setFilter: (key, value) => set({ [key]: value }),
  reset: () =>
    set({
      taskId: null,
      createTask: false,
      projectId: '',
      search: '',
      departmentId: '',
      priority: '',
      deadline: '',
    }),
}));

export type { Project } from '../../lib/types';
export type ProjectInput = {
  name: string;
  clientName: string;
  brief: string;
  deadline: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
};

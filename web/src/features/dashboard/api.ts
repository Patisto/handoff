import { get } from '../../api/client';
import type { Dashboard } from './types';
export const getDashboard = (manager: boolean) =>
  get<Dashboard>(`/dashboard/${manager ? 'manager' : 'member'}`);

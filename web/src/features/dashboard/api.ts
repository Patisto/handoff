import { get } from '../../api/client';
import type { Dashboard } from './types';
import type { Activity } from '../../lib/types';
export const getDashboard = (manager: boolean) =>
  get<Dashboard>(`/dashboard/${manager ? 'manager' : 'member'}`);

export const getOverviewActivity = () => get<Activity[]>('/activity', { limit: 6 });

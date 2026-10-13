import { useQuery } from '@tanstack/react-query';
import { getOverviewActivity } from '../api';
export const useOverviewActivity = () =>
  useQuery({ queryKey: ['activity', 'overview'], queryFn: getOverviewActivity });

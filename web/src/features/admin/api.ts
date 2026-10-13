import { all, get } from '../../api/client';
import type { User, Department } from './types';
export const getUsers = () => all<User>('/users');
export const getDepartments = () => get<Department[]>('/departments');

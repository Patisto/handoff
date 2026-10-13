import { api, post } from '../../api/client';
import type { User } from './types';
export const signIn = (email: string, password: string) =>
  post<{ accessToken: string; user: User }>('/auth/login', { email, password });
export const signOut = () => api.post('/auth/logout');

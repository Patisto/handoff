import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '../stores/auth';
import { queryClient } from './query';
import { useUI } from '../stores/ui';
import type { User } from '../lib/types';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 30000,
});
let refreshing: Promise<void> | null = null;
export function refreshSession() {
  if (!refreshing)
    refreshing = axios
      .post<{ data: { accessToken: string; user: User } }>(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true, timeout: 15000 },
      )
      .then((res) => {
        useAuth.getState().setSession(res.data.data.accessToken, res.data.data.user);
      })
      .catch((error) => {
        queryClient.clear();
        useUI.getState().reset();
        useAuth.getState().clear();
        throw error;
      })
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      config &&
      !config._retry &&
      !config.url?.startsWith('/auth/')
    ) {
      config._retry = true;
      await refreshSession();
      return api(config);
    }
    throw error;
  },
);
export const errorMessage = (error: unknown) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.error?.message ?? 'Couldn’t connect. Please try again.')
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';
export async function get<T>(url: string, params?: object) {
  return (await api.get<{ data: T }>(url, { params })).data.data;
}
export async function post<T>(url: string, data?: unknown) {
  return (await api.post<{ data: T }>(url, data)).data.data;
}
export async function patch<T>(url: string, data?: unknown) {
  return (await api.patch<{ data: T }>(url, data)).data.data;
}
export async function all<T>(url: string, params?: object) {
  const result: T[] = [];
  for (let offset = 0; ; offset += 200) {
    const batch = await get<T[]>(url, { ...params, limit: 200, offset });
    result.push(...batch);
    if (batch.length < 200) break;
  }
  return result;
}

import { all, api, post } from '../../api/client';
import type { UploadedFile } from './types';
export const listFiles = (scope: { taskId?: string; projectId?: string }) =>
  all<UploadedFile>('/files', scope);
export async function uploadFile(file: File, scope: { taskId?: string; projectId?: string }) {
  const form = new FormData();
  form.append('file', file);
  for (const [key, value] of Object.entries(scope)) if (value) form.append(key, value);
  return post<UploadedFile>('/files', form);
}
export async function downloadFile(file: UploadedFile) {
  const res = await api.get(`/files/${file.id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.originalName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

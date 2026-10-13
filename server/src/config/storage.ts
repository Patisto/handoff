import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { env } from './env.js';
import { AppError } from '../lib/errors.js';
export interface StorageService {
  save(data: Buffer): Promise<string>;
  get(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}
class LocalStorage implements StorageService {
  private root = path.resolve(env.UPLOAD_DIR);
  private resolve(key: string) {
    if (!/^[0-9a-f-]{36}$/.test(key)) throw new AppError(400, 'Invalid storage key');
    return path.join(this.root, key);
  }
  async save(data: Buffer) {
    await mkdir(this.root, { recursive: true });
    const key = randomUUID();
    await writeFile(this.resolve(key), data, { flag: 'wx', mode: 0o600 });
    return key;
  }
  async get(key: string) {
    const target = this.resolve(key);
    await stat(target);
    return target;
  }
  async delete(key: string) {
    await unlink(this.resolve(key)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
// Swap this implementation for S3/GCS. Storage keys never come from user filenames.
export const storage: StorageService = new LocalStorage();

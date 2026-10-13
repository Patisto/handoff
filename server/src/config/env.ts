import 'dotenv/config';
import { z } from 'zod';
export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_UPLOAD_MB: z.coerce.number().min(1).max(100).default(20),
    FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  })
  .parse(process.env);
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error('JWT secrets must differ');

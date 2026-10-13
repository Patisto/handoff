import { env } from './env.js';
export const corsOptions = { origin: env.WEB_ORIGIN, credentials: true };

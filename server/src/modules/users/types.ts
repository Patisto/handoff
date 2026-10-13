import type { z } from 'zod';
import type { userCreate, userUpdate } from './schema.js';
export type CreateUser = z.infer<typeof userCreate>;
export type UpdateUser = z.infer<typeof userUpdate>;

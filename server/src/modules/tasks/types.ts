import type { z } from 'zod';
import type { taskCreate, taskUpdate, statusUpdate, taskQuery } from './schema.js';
export type CreateTask = z.infer<typeof taskCreate>;
export type UpdateTask = z.infer<typeof taskUpdate>;
export type StatusUpdate = z.infer<typeof statusUpdate>;
export type TaskQuery = z.infer<typeof taskQuery>;

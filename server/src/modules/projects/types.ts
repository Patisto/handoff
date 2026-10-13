import type { z } from 'zod';
import type { projectCreate, projectUpdate } from './schema.js';
export type CreateProject = z.infer<typeof projectCreate>;
export type UpdateProject = z.infer<typeof projectUpdate>;

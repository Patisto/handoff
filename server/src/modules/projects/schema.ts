import { z } from 'zod';
import { text, date, page } from '../../middleware/validation.js';
export const projectCreate = z
  .object({
    name: text,
    clientName: text,
    brief: z.string().max(30000).default(''),
    deadline: date,
    status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  })
  .strict();
export const projectUpdate = projectCreate.partial().strict();
export const projectQuery = page.extend({
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
});

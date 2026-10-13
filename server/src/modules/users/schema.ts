import { z } from 'zod';
import { id, text, page } from '../../middleware/validation.js';
export const userCreate = z
  .object({
    name: text,
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    password: z.string().min(10).max(128),
    role: z.enum(['MANAGER', 'MEMBER']).default('MEMBER'),
    departmentIds: z.array(id).max(30).default([]),
  })
  .strict();
export const userUpdate = userCreate.partial().strict();
export const userQuery = page;

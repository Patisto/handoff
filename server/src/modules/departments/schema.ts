import { z } from 'zod';
import { id, text } from '../../middleware/validation.js';
export const departmentInput = z.object({ name: text }).strict();
export const membershipInput = z.object({ userIds: z.array(id).max(200) }).strict();

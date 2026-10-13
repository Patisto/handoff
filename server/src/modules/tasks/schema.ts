import { z } from 'zod';
import { id, text, date, page } from '../../middleware/validation.js';
export const status = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'REJECTED']);
export const priority = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const taskCreate = z
  .object({
    projectId: id,
    title: text,
    description: z.string().max(20000).default(''),
    departmentId: id,
    assigneeId: id.nullable().optional(),
    priority: priority.default('NORMAL'),
    deadline: date,
  })
  .strict();
export const taskUpdate = taskCreate.omit({ projectId: true }).partial().strict();
export const statusUpdate = z
  .object({
    status,
    rejectionReason: z.string().trim().min(1).max(5000).optional(),
    expectedStatus: status.optional(),
  })
  .strict()
  .refine((v) => v.status !== 'REJECTED' || !!v.rejectionReason, {
    message: 'A rejection reason is required',
    path: ['rejectionReason'],
  });
export const assignment = z
  .object({ departmentId: id.optional(), assigneeId: id.nullable() })
  .strict();
export const taskQuery = page.extend({
  projectId: id.optional(),
  departmentId: id.optional(),
  status: status.optional(),
  priority: priority.optional(),
  deadline: date.optional(),
  deadlineFrom: date.optional(),
  assigneeId: id.optional(),
});

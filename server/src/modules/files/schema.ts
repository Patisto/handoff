import { z } from 'zod';
import { id, page } from '../../middleware/validation.js';
export const attachmentInput = z
  .object({ taskId: id.optional(), projectId: id.optional(), commentId: id.optional() })
  .strict()
  .refine(
    (v) => [v.taskId, v.projectId, v.commentId].filter(Boolean).length === 1,
    'Attach to exactly one task, project, or comment',
  );
export const fileQuery = page.extend({ taskId: id.optional(), projectId: id.optional() });

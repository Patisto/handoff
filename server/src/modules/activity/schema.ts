import { id, page } from '../../middleware/validation.js';
export const activityQuery = page.extend({ projectId: id.optional(), taskId: id.optional() });

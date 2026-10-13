import { z } from 'zod';
import { page } from '../../middleware/validation.js';
export const notificationQuery = page.extend({ unread: z.enum(['true', 'false']).optional() });
export const deviceSchema = z.object({ token: z.string().min(20).max(4096) }).strict();

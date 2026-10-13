import { z } from 'zod';
export const commentInput = z.object({ body: z.string().trim().min(1).max(10000) }).strict();

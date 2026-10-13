import { z } from 'zod';
export const loginSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((s) => s.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();

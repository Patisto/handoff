import { z } from 'zod';
export const id = z.string().min(1).max(100);
export const page = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
export const text = z.string().trim().min(1).max(200);
export const date = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v));
export const routeId = (value: unknown) => id.parse(value);

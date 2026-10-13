import type { Prisma } from '@prisma/client';
export type NotificationPayload = Prisma.InputJsonObject & {
  title: string;
  body: string;
  taskId?: string;
  projectId?: string;
};

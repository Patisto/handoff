import { PrismaClient, Prisma } from '@prisma/client';
export const db = new PrismaClient();
export type Database = Prisma.TransactionClient;
export async function setIdentity(tx: Database, user: { id: string; role: string }) {
  await tx.$executeRaw`SELECT set_config('app.current_user_id', ${user.id}, true)`;
  await tx.$executeRaw`SELECT set_config('app.current_role', ${user.role}, true)`;
}
export async function verifyRuntimeRole() {
  const roles = await db.$queryRaw<
    { rolsuper: boolean; rolbypassrls: boolean }[]
  >`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  if (!roles.length || roles[0].rolsuper || roles[0].rolbypassrls)
    throw new Error('Unsafe DATABASE_URL: runtime database role must be NOSUPERUSER NOBYPASSRLS');
}

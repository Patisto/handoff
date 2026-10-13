import { handle } from '../../middleware/transaction.js';
import { routeId } from '../../middleware/validation.js';
import { notificationQuery, deviceSchema } from './schema.js';
import * as s from './service.js';
export const list = handle((ctx, req) => s.list(ctx, notificationQuery.parse(req.query)));
export const read = handle(async (ctx, req) => {
  await ctx.db.notification.updateMany({
    where: { id: routeId(req.params.id), userId: ctx.user.id },
    data: { read: true },
  });
  return { ok: true };
});
export const readAll = handle(async (ctx) => {
  await ctx.db.notification.updateMany({
    where: { userId: ctx.user.id, read: false },
    data: { read: true },
  });
  return { ok: true };
});
export const device = handle(async (ctx, req) => {
  const { token } = deviceSchema.parse(req.body);
  await ctx.db.pushDevice.upsert({
    where: { token },
    create: { token, userId: ctx.user.id },
    update: { userId: ctx.user.id },
  });
  return { ok: true };
});
export const removeDevice = handle(async (ctx, req) => {
  const { token } = deviceSchema.parse(req.body);
  await ctx.db.pushDevice.deleteMany({ where: { token, userId: ctx.user.id } });
  return { ok: true };
});

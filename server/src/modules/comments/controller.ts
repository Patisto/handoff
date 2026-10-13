import { handle } from '../../middleware/transaction.js';
import { routeId, page } from '../../middleware/validation.js';
import { commentInput } from './schema.js';
import * as s from './service.js';
export const list = handle((ctx, req) =>
  s.list(ctx, routeId(req.params.id), page.parse(req.query)),
);
export const create = handle(
  (ctx, req) => s.create(ctx, routeId(req.params.id), commentInput.parse(req.body).body),
  201,
);
export const remove = handle((ctx, req) => s.remove(ctx, routeId(req.params.id)));

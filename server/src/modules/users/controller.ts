import { handle } from '../../middleware/transaction.js';
import { routeId } from '../../middleware/validation.js';
import * as s from './service.js';
import * as v from './schema.js';
export const list = handle((ctx, req) => s.list(ctx, v.userQuery.parse(req.query)));
export const create = handle((ctx, req) => s.create(ctx, v.userCreate.parse(req.body)), 201);
export const update = handle((ctx, req) =>
  s.update(ctx, routeId(req.params.id), v.userUpdate.parse(req.body)),
);
export const deactivate = handle((ctx, req) => s.deactivate(ctx, routeId(req.params.id)));

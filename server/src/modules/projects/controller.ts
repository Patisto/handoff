import { handle } from '../../middleware/transaction.js';
import { routeId } from '../../middleware/validation.js';
import * as s from './service.js';
import * as v from './schema.js';
export const list = handle((ctx, req) => s.list(ctx, v.projectQuery.parse(req.query)));
export const get = handle((ctx, req) => s.get(ctx, routeId(req.params.id)));
export const create = handle((ctx, req) => s.create(ctx, v.projectCreate.parse(req.body)), 201);
export const update = handle((ctx, req) =>
  s.update(ctx, routeId(req.params.id), v.projectUpdate.parse(req.body)),
);
export const remove = handle((ctx, req) => s.remove(ctx, routeId(req.params.id)));

import { handle } from '../../middleware/transaction.js';
import { routeId } from '../../middleware/validation.js';
import * as schema from './schema.js';
import * as s from './service.js';
export const list = handle((ctx, req) => s.list(ctx, schema.taskQuery.parse(req.query)));
export const get = handle((ctx, req) => s.get(ctx, routeId(req.params.id)));
export const create = handle((ctx, req) => s.create(ctx, schema.taskCreate.parse(req.body)), 201);
export const update = handle((ctx, req) =>
  s.update(ctx, routeId(req.params.id), schema.taskUpdate.parse(req.body)),
);
export const status = handle((ctx, req) =>
  s.changeStatus(ctx, routeId(req.params.id), schema.statusUpdate.parse(req.body)),
);
export const assign = handle((ctx, req) =>
  s.update(ctx, routeId(req.params.id), schema.assignment.parse(req.body)),
);
export const remove = handle((ctx, req) => s.remove(ctx, routeId(req.params.id)));

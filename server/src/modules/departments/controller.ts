import { handle } from '../../middleware/transaction.js';
import { routeId } from '../../middleware/validation.js';
import * as s from './service.js';
import * as v from './schema.js';
export const list = handle((ctx) => s.list(ctx));
export const create = handle((ctx, req) => s.create(ctx, v.departmentInput.parse(req.body)), 201);
export const update = handle((ctx, req) =>
  s.update(ctx, routeId(req.params.id), v.departmentInput.parse(req.body)),
);
export const members = handle((ctx, req) =>
  s.members(ctx, routeId(req.params.id), v.membershipInput.parse(req.body)),
);

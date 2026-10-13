import { handle } from '../../middleware/transaction.js';
import { activityQuery } from './schema.js';
import * as s from './service.js';
export const list = handle((ctx, req) => s.list(ctx, activityQuery.parse(req.query)));

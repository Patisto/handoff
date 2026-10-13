import { handle } from '../../middleware/transaction.js';
import { dashboardQuery } from './schema.js';
import { overview } from './service.js';
export const get = handle((ctx, req) => {
  dashboardQuery.parse(req.query);
  return overview(ctx);
});

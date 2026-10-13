import { handle } from '../../middleware/transaction.js';
import { routeId } from '../../middleware/validation.js';
import { attachmentInput, fileQuery } from './schema.js';
import { storage } from '../../config/storage.js';
import * as s from './service.js';
export const upload = handle(
  (ctx, req) => s.upload(ctx, attachmentInput.parse(req.body), req.file),
  201,
);
export const get = handle((ctx, req) => s.get(ctx, routeId(req.params.id)));
export const list = handle((ctx, req) => s.list(ctx, fileQuery.parse(req.query)));
export const download = handle(
  async (ctx, req) => {
    const file = await s.get(ctx, routeId(req.params.id));
    return { path: await storage.get(file.path), name: file.originalName };
  },
  200,
  (data, res) => {
    const file = data as { path: string; name: string };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.download(file.path, file.name);
  },
);

import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import * as c from './controller.js';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 3, parts: 4 },
});
export const router = Router();
router.get('/', c.list);
router.post('/', upload.single('file'), c.upload);
router.get('/:id', c.get);
router.get('/:id/download', c.download);

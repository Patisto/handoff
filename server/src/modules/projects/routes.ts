import { Router } from 'express';
import { requireRole } from '../../middleware/rbac.js';
import * as c from './controller.js';
export const router = Router();
router.get('/', c.list);
router.post('/', requireRole('MANAGER'), c.create);
router.get('/:id', c.get);
router.patch('/:id', requireRole('MANAGER'), c.update);
router.delete('/:id', requireRole('MANAGER'), c.remove);

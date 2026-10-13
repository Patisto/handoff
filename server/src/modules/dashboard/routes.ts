import { Router } from 'express';
import { requireRole } from '../../middleware/rbac.js';
import * as c from './controller.js';
export const router = Router();
router.get('/manager', requireRole('MANAGER'), c.get);
router.get('/member', c.get);

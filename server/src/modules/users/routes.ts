import { Router } from 'express';
import * as c from './controller.js';
export const router = Router();
router.get('/', c.list);
router.post('/', c.create);
router.patch('/:id', c.update);
router.patch('/:id/deactivate', c.deactivate);

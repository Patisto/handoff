import { Router } from 'express';
import * as c from './controller.js';
export const router = Router();
router.get('/', c.list);
router.patch('/read-all', c.readAll);
router.patch('/:id/read', c.read);
router.post('/devices', c.device);
router.delete('/devices', c.removeDevice);

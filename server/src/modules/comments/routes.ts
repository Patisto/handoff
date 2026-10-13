import { Router } from 'express';
import * as c from './controller.js';
export const router = Router();
router.get('/tasks/:id/comments', c.list);
router.post('/tasks/:id/comments', c.create);
router.delete('/comments/:id', c.remove);

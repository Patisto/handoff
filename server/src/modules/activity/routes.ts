import { Router } from 'express';
import * as c from './controller.js';
export const router = Router();
router.get('/', c.list);

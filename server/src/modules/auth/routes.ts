import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.js';
import * as c from './controller.js';
export const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    data: null,
    error: { code: 'RATE_LIMIT', message: 'Too many attempts. Try again later.' },
  },
});
router.post('/login', limiter, c.login);
router.post('/refresh', limiter, c.refresh);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.me);

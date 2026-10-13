import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { requireRole } from './middleware/rbac.js';
import { errorHandler } from './middleware/error.js';
import { AppError } from './lib/errors.js';
import { router as auth } from './modules/auth/routes.js';
import { router as users } from './modules/users/routes.js';
import { router as departments } from './modules/departments/routes.js';
import { router as projects } from './modules/projects/routes.js';
import { router as tasks } from './modules/tasks/routes.js';
import { router as comments } from './modules/comments/routes.js';
import { router as files } from './modules/files/routes.js';
import { router as notifications } from './modules/notifications/routes.js';
import { router as activity } from './modules/activity/routes.js';
import { router as dashboard } from './modules/dashboard/routes.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet(), cors(corsOptions), express.json({ limit: '1mb' }), cookieParser());
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', (req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== env.WEB_ORIGIN
  )
    return next(new AppError(403, 'Origin not allowed'));
  next();
});
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      data: null,
      error: { code: 'RATE_LIMIT', message: 'Too many requests. Try again shortly.' },
    },
  }),
);
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' }, error: null }));
app.use('/api/auth', auth);
app.use('/api', authenticate);
app.use('/api/users', requireRole('MANAGER'), users);
app.use('/api/departments', requireRole('MANAGER'), departments);
app.use('/api/projects', projects);
app.use('/api/tasks', tasks);
app.use('/api', comments);
app.use('/api/files', files);
app.use('/api/notifications', notifications);
app.use('/api/activity', activity);
app.use('/api/dashboard', dashboard);
app.use((_req, _res, next) => next(new AppError(404, 'Endpoint not found', 'NOT_FOUND')));
app.use(errorHandler);

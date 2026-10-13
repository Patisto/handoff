import type { RequestHandler, Response } from 'express';
import * as service from './service.js';
import { loginSchema } from './schema.js';
import { env } from '../../config/env.js';
import { handle } from '../../middleware/transaction.js';
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
};
function respond(res: Response, result: Awaited<ReturnType<typeof service.login>>) {
  res.cookie('handoff_refresh', result.refreshToken, { ...cookieOptions, maxAge: 7 * 86400000 });
  res.json({ data: { accessToken: result.accessToken, user: result.user }, error: null });
}
export const login: RequestHandler = (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    service
      .login(input.email, input.password)
      .then((data) => respond(res, data))
      .catch(next);
  } catch (e) {
    next(e);
  }
};
export const refresh: RequestHandler = (req, res, next) => {
  service
    .refresh(String(req.cookies?.handoff_refresh ?? ''))
    .then((data) => respond(res, data))
    .catch(next);
};
export const logout: RequestHandler = (req, res, next) => {
  service
    .logout(req.cookies?.handoff_refresh)
    .then(() => {
      res.clearCookie('handoff_refresh', cookieOptions);
      res.json({ data: { ok: true }, error: null });
    })
    .catch(next);
};
export const me = handle(async (ctx) =>
  ctx.db.user.findUnique({ where: { id: ctx.user.id }, select: service.publicUser }),
);

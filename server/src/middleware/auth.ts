import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
export type Identity = { id: string; role: 'MANAGER' | 'MEMBER'; departmentIds: string[] };
export async function identityFromToken(token: string): Promise<Identity> {
  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'handoff',
      audience: 'handoff-web',
    }) as jwt.JwtPayload;
  } catch {
    throw new AppError(401, 'Session expired. Please sign in.', 'UNAUTHORIZED');
  }
  if (claims.type !== 'access' || !claims.sub) throw new AppError(401, 'Invalid access token');
  const user = await db.user.findUnique({
    where: { id: claims.sub },
    include: { departments: true },
  });
  if (!user?.active) throw new AppError(401, 'Account is inactive', 'UNAUTHORIZED');
  return {
    id: user.id,
    role: user.role,
    departmentIds: user.departments.map((d) => d.departmentId),
  };
}
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return next(new AppError(401, 'Sign in required', 'UNAUTHORIZED'));
  identityFromToken(token)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(next);
};

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
export const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  departments: { include: { department: true } },
} as const;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const unauthorized = () => new AppError(401, 'Invalid or expired credentials', 'UNAUTHORIZED');
const dummyHash = bcrypt.hashSync('constant-time-missing-user', 12);
function tokens(id: string) {
  const accessToken = jwt.sign({ type: 'access' }, env.JWT_ACCESS_SECRET, {
    subject: id,
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'handoff',
    audience: 'handoff-web',
  });
  const refreshToken = jwt.sign({ type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    subject: id,
    jwtid: randomUUID(),
    expiresIn: '7d',
    algorithm: 'HS256',
    issuer: 'handoff',
    audience: 'handoff-refresh',
  });
  return { accessToken, refreshToken };
}
export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!valid || !user?.active) throw unauthorized();
  const pair = tokens(user.id);
  await db.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hash(pair.refreshToken),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return {
    ...pair,
    user: await db.user.findUnique({ where: { id: user.id }, select: publicUser }),
  };
}
export async function refresh(token: string) {
  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: 'handoff',
      audience: 'handoff-refresh',
    }) as jwt.JwtPayload;
  } catch {
    throw unauthorized();
  }
  if (claims.type !== 'refresh' || !claims.sub) throw unauthorized();
  return db.$transaction(async (tx) => {
    const session = await tx.refreshSession.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: true },
    });
    if (
      !session ||
      session.expiresAt < new Date() ||
      !session.user.active ||
      session.userId !== claims.sub
    )
      throw unauthorized();
    const pair = tokens(session.userId);
    const rotated = await tx.refreshSession.updateMany({
      where: { id: session.id, tokenHash: hash(token) },
      data: { tokenHash: hash(pair.refreshToken), expiresAt: new Date(Date.now() + 7 * 86400000) },
    });
    if (rotated.count !== 1) throw unauthorized();
    return {
      ...pair,
      user: await tx.user.findUnique({ where: { id: session.userId }, select: publicUser }),
    };
  });
}
export async function logout(token?: string) {
  if (token) await db.refreshSession.deleteMany({ where: { tokenHash: hash(token) } });
}

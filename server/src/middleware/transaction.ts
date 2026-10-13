import type { Request, RequestHandler, Response } from 'express';
import { db, setIdentity, type Database } from '../config/db.js';
import type { Identity } from './auth.js';
declare global {
  // Express request augmentation uses its global namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: Identity;
    }
  }
}
export type Context = {
  db: Database;
  user: Identity;
  afterCommit: (effect: () => void | Promise<void>) => void;
  onRollback: (effect: () => Promise<void>) => void;
};
export type Handler = (ctx: Context, req: Request) => Promise<unknown>;
export function handle(
  fn: Handler,
  status = 200,
  deliver?: (data: unknown, res: Response) => void,
): RequestHandler {
  return (req, res, next) => {
    const effects: (() => void | Promise<void>)[] = [];
    const rollbacks: (() => Promise<void>)[] = [];
    db.$transaction(
      async (tx) => {
        await setIdentity(tx, req.user);
        return fn(
          {
            db: tx,
            user: req.user,
            afterCommit: (effect) => effects.push(effect),
            onRollback: (effect) => rollbacks.push(effect),
          },
          req,
        );
      },
      { maxWait: 5000, timeout: 15000 },
    )
      .then((data) => {
        for (const effect of effects)
          Promise.resolve()
            .then(effect)
            .catch((error) => console.error('Post-commit delivery failed', error));
        if (deliver) deliver(data, res);
        else res.status(status).json({ data, error: null });
      })
      .catch(async (error) => {
        await Promise.allSettled(rollbacks.map((fn) => fn()));
        next(error);
      });
  };
}

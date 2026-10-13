import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync } from 'node:fs';
import { env } from '../../config/env.js';
import { db } from '../../config/db.js';
import type { NotificationPayload } from './types.js';
let configured = false;
if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    if (!getApps().length)
      initializeApp({
        credential: cert(JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))),
      });
    configured = true;
  } catch (error) {
    console.warn('FCM unavailable; in-app notifications remain enabled.', error);
  }
}
export async function push(userId: string, payload: NotificationPayload) {
  if (!configured) return;
  const devices = await db.pushDevice.findMany({ where: { userId } });
  for (let i = 0; i < devices.length; i += 500) {
    const batch = devices.slice(i, i + 500);
    const result = await getMessaging().sendEachForMulticast({
      tokens: batch.map((d) => d.token),
      notification: { title: payload.title, body: payload.body },
      data: { taskId: payload.taskId ?? '', projectId: payload.projectId ?? '' },
    });
    const invalid = result.responses.flatMap((r, j) =>
      r.error &&
      [
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token',
      ].includes(r.error.code)
        ? [batch[j].id]
        : [],
    );
    if (invalid.length) await db.pushDevice.deleteMany({ where: { id: { in: invalid } } });
  }
}

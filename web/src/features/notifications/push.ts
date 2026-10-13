import { post, api } from '../../api/client';
import workerUrl from './push-worker.ts?worker&url';
let token: string | null = localStorage.getItem('handoff-push-token');
export async function enablePush() {
  if (!import.meta.env.VITE_FIREBASE_CONFIG || !import.meta.env.VITE_FIREBASE_VAPID_KEY)
    throw new Error('Push is not configured. Your in-app inbox is always available.');
  const { initializeApp, getApps } = await import('firebase/app');
  const { getMessaging, getToken, isSupported, onMessage } = await import('firebase/messaging');
  if (!(await isSupported())) throw new Error('This browser does not support push notifications.');
  if ((await Notification.requestPermission()) !== 'granted')
    throw new Error('Allow notifications in your browser settings to enable push.');
  const app = getApps()[0] ?? initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));
  // FCM handles background notification payloads through this bundled worker.
  const registration = await navigator.serviceWorker.register(workerUrl, { type: 'module' });
  if (!registration.active)
    await new Promise<void>((resolve) => {
      const worker = registration.installing ?? registration.waiting;
      if (!worker) return resolve();
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
      });
    });

  token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  await post('/notifications/devices', { token });
  localStorage.setItem('handoff-push-token', token);
  onMessage(getMessaging(app), () => {});
}
export async function removePushDevice() {
  if (token) {
    await api.delete('/notifications/devices', { data: { token } });
    token = null;
    localStorage.removeItem('handoff-push-token');
  }
}

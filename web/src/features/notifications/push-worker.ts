/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
const config = import.meta.env.VITE_FIREBASE_CONFIG;
if (config) {
  const app = initializeApp(JSON.parse(config));
  onBackgroundMessage(getMessaging(app), () => {
    /* FCM displays notification payloads automatically. */
  });
}
export {};

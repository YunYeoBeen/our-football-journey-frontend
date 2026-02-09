import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase 설정 - 환경 변수에서 가져옴
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Messaging 인스턴스 (브라우저 환경에서만)
let messaging: ReturnType<typeof getMessaging> | null = null;

if (typeof window !== 'undefined' && 'Notification' in window) {
  messaging = getMessaging(app);
}

// FCM 토큰 획득
export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    return token || null;
  } catch (error) {
    console.error('FCM token error:', error);
    return null;
  }
};

// 포그라운드 메시지 수신 리스너
export const onForegroundMessage = (callback: (payload: unknown) => void) => {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export { app, messaging };

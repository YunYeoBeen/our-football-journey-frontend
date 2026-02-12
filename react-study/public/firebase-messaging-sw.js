/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

// Firebase 설정 (Service Worker에서는 환경 변수 사용 불가, 직접 설정)
firebase.initializeApp({
  apiKey: 'AIzaSyD4fgGi01sSKmRhBUdKMu4s8SQ_WS9pBqA',
  authDomain: 'musahae-3f801.firebaseapp.com',
  projectId: 'musahae-3f801',
  storageBucket: 'musahae-3f801.firebasestorage.app',
  messagingSenderId: '579710368473',
  appId: '1:579710368473:web:5462180d270e876fa31cc8',
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 (data-only 메시지)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', JSON.stringify(payload));

  const title = payload.data?.title || '새 알림';
  const body = payload.data?.body || '';
  const boardId = payload.data?.boardId;

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: boardId ? `board-${boardId}` : undefined,
    data: { title, body, boardId },
  });
});

// 알림 클릭 처리 - 해당 게시글로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const boardId = event.notification.data?.boardId;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 postMessage로 알림 → 앱에서 바로 게시글 열기
      for (const client of clientList) {
        if (client.visibilityState === 'visible' || client.focused) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', boardId });
          return client.focus();
        }
      }

      // 열린 창이 있지만 비활성 → navigate + focus
      for (const client of clientList) {
        if ('focus' in client) {
          const targetUrl = boardId ? `/home?boardId=${boardId}` : '/home';
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      // 없으면 새 창 열기
      if (clients.openWindow) {
        const targetUrl = boardId ? `/home?boardId=${boardId}` : '/home';
        return clients.openWindow(targetUrl);
      }
    })
  );
});

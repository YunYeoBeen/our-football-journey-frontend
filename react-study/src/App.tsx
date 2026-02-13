import { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/userAuthStore';
import LoginPage from './components/LoginPage';
import OAuthCallback from './components/OAuthCallback'
import HomePage from './components/HomePage';
import { jwtDecode } from 'jwt-decode';
import { getFCMToken, onForegroundMessage } from './services/firebase';
import { userApi } from './services/userApi';

// 포그라운드 알림 토스트 (클릭 시 게시글 이동)
function showNotificationToast(title: string, body: string, boardId?: string) {
  const existing = document.getElementById('fcm-toast');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'fcm-toast';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99998;
    display: flex;
    justify-content: center;
    padding-top: 16px;
    pointer-events: none;
  `;

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
    cursor: ${boardId ? 'pointer' : 'default'};
    max-width: 360px;
    width: calc(100vw - 32px);
  `;

  toast.innerHTML = `
    <div style="
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #ffb4a8, #ff8a75);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    ">
      <span style="font-size: 18px; font-family: 'Material Symbols Outlined'; color: white;">notifications</span>
    </div>
    <div style="flex: 1; min-width: 0;">
      <p style="margin: 0; font-size: 14px; font-weight: 700; color: #181110; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title}</p>
      <p style="margin: 2px 0 0; font-size: 13px; color: #8d645e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${body}</p>
    </div>
    <span style="font-size: 18px; font-family: 'Material Symbols Outlined'; color: #9ca3af; flex-shrink: 0;">chevron_right</span>
  `;

  if (boardId) {
    toast.addEventListener('click', () => {
      overlay.remove();
      // 포그라운드에서는 커스텀 이벤트로 바로 게시글 열기 (리로드 없이)
      window.dispatchEvent(new CustomEvent('open-board', { detail: { boardId } }));
    });
  }

  overlay.appendChild(toast);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  });

  // 5초 후 자동 사라짐
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => overlay.remove(), 400);
  }, 5000);
}

function App() {
  const { user, login } = useAuthStore();

  // 백그라운드 알림 클릭 시 boardId를 sessionStorage에 보존 (리다이렉트 사이클에서 URL 파라미터 유실 방지)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boardId = params.get('boardId');
    if (boardId) {
      sessionStorage.setItem('pendingBoardId', boardId);
    }
  }, []);

  // Service Worker에서 알림 클릭 시 postMessage로 전달받아 게시글 열기
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.boardId) {
        window.dispatchEvent(new CustomEvent('open-board', { detail: { boardId: event.data.boardId } }));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handler);
    };
  }, []);

  // 페이지 새로고침 시 로그인 상태 복구
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !user) {
        try {
          const decoded = jwtDecode<{ name: string; email: string }>(token);
          login(token, {
            name: decoded.name,
            email: decoded.email
          });

          // 이미 알림 권한이 부여된 경우에만 FCM 토큰 갱신
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const fcmToken = await getFCMToken();
              if (fcmToken) {
                await userApi.updateFirebaseToken(fcmToken);
              }
            } catch (fcmError) {
              console.warn('FCM token refresh failed:', fcmError);
            }
          }
        } catch {
          localStorage.removeItem('accessToken');
        }
      }
    };

    restoreSession();
  }, [user, login]);

  // 포그라운드 FCM 메시지 수신 (data-only 메시지)
  const handleForegroundMessage = useCallback(() => {
    const unsubscribe = onForegroundMessage((payload: unknown) => {
      const msg = payload as {
        notification?: { title?: string; body?: string };
        data?: { title?: string; body?: string; boardId?: string };
      };
      const title = msg.data?.title || msg.notification?.title || '새 알림';
      const body = msg.data?.body || msg.notification?.body || '';
      const boardId = msg.data?.boardId;
      showNotificationToast(title, body, boardId);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = handleForegroundMessage();
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [user, handleForegroundMessage]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/home" element={user ? <HomePage /> : <Navigate to="/" />} />
        <Route path="/main" element={<Navigate to="/home" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
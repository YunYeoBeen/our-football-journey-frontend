import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/userAuthStore';
import LoginPage from './components/LoginPage';
import OAuthCallback from './components/OAuthCallback'
import HomePage from './components/HomePage';
import { jwtDecode } from 'jwt-decode';
import { getFCMToken } from './services/firebase';
import { userApi } from './services/userApi';

function App() {
  const { user, login } = useAuthStore();

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
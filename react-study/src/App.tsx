import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/userAuthStore';
import LoginPage from './components/LoginPage';
import OAuthCallback from './components/OAuthCallback'
import MainPage from './components/MainPage';
import { jwtDecode } from 'jwt-decode';

function App() {
  const { user, login } = useAuthStore();

  // 페이지 새로고침 시 로그인 상태 복구
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !user) {
      try {
        const decoded = jwtDecode<{ name: string; email: string }>(token);
        login(token, {
          name: decoded.name,
          email: decoded.email
        });
      } catch (err) {
        console.error('토큰 복구 실패', err);
        localStorage.removeItem('accessToken');
      }
    }
  }, [user, login]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <LoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/home" element={user ? <MainPage /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

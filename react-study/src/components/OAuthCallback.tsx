import { useAuthStore } from '../store/userAuthStore';
import { jwtDecode } from 'jwt-decode';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OAuthCallback() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error === 'unauthorized') {
      alert('접근이 허용되지 않은 사용자입니다.\n관리자에게 문의해주세요.');
      navigate('/');
      return;
    }

    if (!token) {
      alert('토큰이 없습니다. 로그인 실패');
      navigate('/');
      return;
    }

    try {
      const decoded = jwtDecode<{ name: string; email: string }>(token);
      login(token, {
        name: decoded.name,
        email: decoded.email
      });
      navigate('/home');
    } catch {
      alert('토큰 처리 중 오류');
      navigate('/');
    }
  }, [login, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>💕</div>
        <div style={{ fontSize: 20, color: '#ff9a76', fontWeight: 'bold' }}>
          로그인 중...
        </div>
      </div>
    </div>
  );
}
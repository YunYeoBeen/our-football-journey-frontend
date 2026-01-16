import { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// Google 로고 SVG 컴포넌트
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function GoogleLoginButton() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleGoogleLogin = () => {
    const loginUrl = `${BACKEND_URL}/api/v1/oauth2/authorization/google`;
    window.location.href = loginUrl;
  };

  return (
    <button
      onClick={handleGoogleLogin}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={{
        display: 'flex',
        width: '100%',
        cursor: 'pointer',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '12px',
        height: '56px',
        padding: '0 24px',
        backgroundColor: isHovered ? '#f9f9f9' : '#ffffff',
        color: '#181110',
        border: '1px solid #F3F3F3',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        gap: '12px',
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'all 0.2s ease',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        outline: 'none',
      }}
    >
      <GoogleIcon />
      <span
        style={{
          fontSize: '16px',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        Sign in with Google
      </span>
    </button>
  );
}

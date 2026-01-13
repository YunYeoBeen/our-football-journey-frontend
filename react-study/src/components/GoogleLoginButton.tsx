import React from 'react';
import { Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export default function GoogleLoginButton() {
  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
  };

  return (
    <Button
      type="primary"
      size="large"
      icon={<GoogleOutlined />}
      onClick={handleGoogleLogin}
      style={{
        width: '100%',
        height: 50,
        fontSize: 16,
        background: '#ff9a76',
        borderColor: '#ff9a76',
        borderRadius: 10
      }}
    >
      Google로 시작하기
    </Button>
  );
}
import React from 'react';
import { Card, Typography } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import GoogleLoginButton from '../components/GoogleLoginButton';

const { Title, Text } = Typography;

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}
    >
      <Card
        style={{
          width: 400,
          textAlign: 'center',
          borderRadius: 20,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ marginBottom: 30 }}>
          <HomeOutlined style={{ fontSize: 60, color: '#ff9a76' }} />
          <Title level={2} style={{ marginTop: 20, color: '#ff9a76' }}>
            우리의 추억
          </Title>
          <Text type="secondary">소중한 순간을 함께 나눠요</Text>
        </div>

        <GoogleLoginButton />
      </Card>
    </div>
  );
}
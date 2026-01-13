import React, { useState, useEffect } from 'react';
import { Layout, Tabs, Avatar, Typography } from 'antd';
import { HomeOutlined, UserOutlined, CameraOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/userAuthStore';
import { useNavigate } from 'react-router-dom';
import MemoryPage from './MemoryPage';
import CalendarPage from './CalendarPage';

const { Header, Content } = Layout;
const { Title } = Typography;

const MainPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('memories');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    fetch('http://localhost:8080/logout', {
      method: 'POST',
      credentials: 'include',
    });
  
    localStorage.removeItem('accessToken');
    useAuthStore.getState().logout();
    navigate('/');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff8f0' }}>
      <Header
        style={{
          background: 'linear-gradient(90deg, #ff9a76 0%, #ffb88c 100%)',
          padding: '0 50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HomeOutlined style={{ fontSize: 28, color: 'white' }} />
          <Title level={3} style={{ margin: 0, color: 'white' }}>
            우리의 추억
          </Title>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'white', fontWeight: 500 }}>
            {user?.name ?? '사용자'}
          </span>

          <Avatar
            style={{ background: '#ffd4a3', cursor: 'pointer' }}
            icon={<UserOutlined />}
            onClick={handleLogout}
          />
        </div>
      </Header>

      <Content style={{ padding: '30px 50px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: 'memories',
              label: (
                <span>
                  <CameraOutlined /> 우리 추억
                </span>
              ),
              children: <MemoryPage />
            },
            {
              key: 'calendar',
              label: (
                <span>
                  <CalendarOutlined /> 가족 달력
                </span>
              ),
              children: <CalendarPage />
            }
          ]}
        />
      </Content>
    </Layout>
  );
};

export default MainPage;
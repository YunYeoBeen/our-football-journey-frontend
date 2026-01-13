import React, { useState } from 'react';
import { Button, Tabs } from 'antd';
import { PlusOutlined, CameraOutlined, ClockCircleOutlined } from '@ant-design/icons';
import GalleryView from '../components/GalleryView';
import TimelineView from '../components/TimelineView';
import AddMemoryModal from '../components/AddMemoryModal';

export default function MemoryPage() {
  const [viewMode, setViewMode] = useState<'gallery' | 'timeline'>('gallery');
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: 20, textAlign: 'right' }}>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          style={{
            background: '#ff9a76',
            borderColor: '#ff9a76',
            borderRadius: 12,
            height: 45,
            fontSize: 16,
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(255, 154, 118, 0.3)'
          }}
        >
          추억 남기기
        </Button>
      </div>

      <Tabs
        activeKey={viewMode}
        onChange={(key) => setViewMode(key as 'gallery' | 'timeline')}
        size="large"
        items={[
          {
            key: 'gallery',
            label: <span><CameraOutlined /> 갤러리</span>,
            children: <GalleryView />
          },
          {
            key: 'timeline',
            label: <span><ClockCircleOutlined /> 타임라인</span>,
            children: <TimelineView />
          }
        ]}
      />

      <AddMemoryModal 
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </div>
  );
}
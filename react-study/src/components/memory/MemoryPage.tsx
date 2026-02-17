import { useState, useEffect } from 'react';
import { Button, Tabs, message, Spin } from 'antd';
import { PlusOutlined, CameraOutlined, ClockCircleOutlined } from '@ant-design/icons';
import GalleryView from './GalleryView';
import TimelineView from '../timeline/TimelineView';
import AddMemoryModal from './AddMemoryModal';
import { boardApi } from '../../services/boardApi';
import { useMemoryStore } from '../../store/userMemoryStore';
import type { Memory } from '../../types';

export default function MemoryPage() {
  const [viewMode, setViewMode] = useState<'gallery' | 'timeline'>('gallery');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const setMemories = useMemoryStore((state) => state.setMemories);

  // 컴포넌트 마운트 시 서버에서 데이터 가져오기
  useEffect(() => {
    const fetchMemories = async () => {
      try {
        setLoading(true);
        const response = await boardApi.getAllList(0, 100);

        // 서버 응답을 Memory 타입으로 변환
        const memories: Memory[] = response.content.map((board, index) => ({
          id: board.id ?? index,
          startDate: board.startDate,
          endDate: board.endDate,
          title: board.title,
          location: board.place ?? '',
          category: (board.category as Memory['category']) ?? '축구',
          content: board.content ?? '',
          images: board.imageUrl ? [board.imageUrl] : ['https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400'],
          weather: (board.weather as Memory['weather']) ?? '맑음'
        }));

        setMemories(memories);
      } catch {
        // 게시물 조회 실패
        message.error('추억을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemories();
  }, [setMemories]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#999' }}>추억을 불러오는 중...</p>
      </div>
    );
  }

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
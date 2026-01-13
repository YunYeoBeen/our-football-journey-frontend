import React from 'react';
import { Card, Tag, Rate, Space } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, HeartOutlined } from '@ant-design/icons';
import { useMemoryStore } from '../store/userMemoryStore'

const categoryColors: { [key: string]: string } = {
  '데이트': 'pink',
  '기념일': 'red',
  '여행': 'blue',
  '일상': 'green'
};

const weatherEmoji: { [key: string]: string } = {
  '맑음': '☀️',
  '흐림': '☁️',
  '비': '🌧️',
  '눈': '❄️'
};

export default function GalleryView() {
  const memories = useMemoryStore((state) => state.memories);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: 24
    }}>
      {memories.map(memory => (
        <Card
          key={memory.id}
          hoverable
          cover={
            <div style={{ position: 'relative' }}>
              <img 
                alt="memory" 
                src={memory.images[0]} 
                style={{ height: 240, objectFit: 'cover', width: '100%' }} 
              />
              <Tag 
                color={categoryColors[memory.category]}
                style={{ position: 'absolute', top: 10, right: 10, fontSize: '13px' }}
              >
                {memory.category}
              </Tag>
            </div>
          }
          style={{ 
            borderRadius: 20, 
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(255, 154, 118, 0.15)'
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#ff9a76',
              marginBottom: 8
            }}>
              {memory.title}
            </h3>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <div style={{ fontSize: '13px', color: '#999' }}>
                <ClockCircleOutlined /> {memory.date}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                <EnvironmentOutlined /> {memory.location}
              </div>
            </Space>
          </div>
          
          <p style={{ color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
            {memory.content}
          </p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid #f0f0f0'
          }}>
            <Space>
              <span>{weatherEmoji[memory.weather]}</span>
              <span style={{ fontSize: '13px', color: '#999' }}>⏱️ {memory.duration}</span>
            </Space>
            <Rate 
              disabled 
              value={memory.mood} 
              character={<HeartOutlined />}
              style={{ fontSize: 16, color: '#ff9a76' }}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
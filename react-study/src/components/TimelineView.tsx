import React from 'react';
import { Card, Tag, Rate, Space, Timeline } from 'antd';
import { HeartOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useMemoryStore } from '../store/userMemoryStore';

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

export default function TimelineView() {
  const memories = useMemoryStore((state) => state.memories);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Timeline
        mode="left"
        items={memories.map(memory => ({
          color: categoryColors[memory.category],
          dot: <HeartOutlined style={{ fontSize: 20 }} />,
          label: (
            <div style={{ fontWeight: 'bold', color: '#ff9a76' }}>
              {memory.date}
            </div>
          ),
          children: (
            <Card
              hoverable
              style={{ 
                borderRadius: 15,
                boxShadow: '0 2px 8px rgba(255, 154, 118, 0.1)'
              }}
            >
              <div style={{ display: 'flex', gap: 16 }}>
                <img 
                  src={memory.images[0]} 
                  alt="memory"
                  style={{ 
                    width: 200, 
                    height: 200, 
                    objectFit: 'cover', 
                    borderRadius: 12 
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Space>
                      <Tag color={categoryColors[memory.category]}>{memory.category}</Tag>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        color: '#333',
                        margin: 0
                      }}>
                        {memory.title}
                      </h3>
                    </Space>
                  </div>
                  
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      <EnvironmentOutlined /> {memory.location}
                    </div>
                    <p style={{ color: '#666', lineHeight: 1.6, margin: '8px 0' }}>
                      {memory.content}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginTop: 8
                    }}>
                      <Space>
                        <span>{weatherEmoji[memory.weather]}</span>
                        <span style={{ fontSize: '13px', color: '#999' }}>
                          ⏱️ {memory.duration}
                        </span>
                      </Space>
                      <Rate 
                        disabled 
                        value={memory.mood} 
                        character={<HeartOutlined />}
                        style={{ fontSize: 14, color: '#ff9a76' }}
                      />
                    </div>
                  </Space>
                </div>
              </div>
            </Card>
          )
        }))}
      />
    </div>
  );
}
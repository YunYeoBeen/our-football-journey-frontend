// ==========================================
// pages/CalendarPage.tsx - 달력 페이지 (기존 코드)
// ==========================================
import React, { useState } from 'react';
import { Card, Button, Modal, Calendar, Badge, Input, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

interface ScheduleItem {
  type: 'success' | 'warning' | 'error' | 'default' | 'processing';
  content: string;
}

interface Schedules {
  [key: string]: ScheduleItem[];
}

export default function CalendarPage() {
  const [schedules, setSchedules] = useState<Schedules>({
    '2024-12-31': [{ type: 'success', content: '가족 송년회 🎉' }],
    '2025-01-01': [{ type: 'warning', content: '새해 첫날 모임' }],
    '2025-01-15': [{ type: 'error', content: '할머니 생신' }]
  });

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [newScheduleDate, setNewScheduleDate] = useState<string>('');
  const [newScheduleContent, setNewScheduleContent] = useState<string>('');

  const handleAddSchedule = () => {
    if (!newScheduleDate || !newScheduleContent) {
      message.warning('날짜와 내용을 모두 입력해주세요');
      return;
    }

    setSchedules({
      ...schedules,
      [newScheduleDate]: [
        ...(schedules[newScheduleDate] || []),
        { type: 'success', content: newScheduleContent }
      ]
    });

    setNewScheduleDate('');
    setNewScheduleContent('');
    setIsModalVisible(false);
    message.success('일정이 추가되었습니다! 📅');
  };

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const listData = schedules[dateStr] || [];
    
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item, index) => (
          <li key={index}>
            <Badge 
              status={item.type} 
              text={item.content} 
              style={{ fontSize: '12px' }} 
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 20, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          size="large"
          style={{
            background: '#ff9a76',
            borderColor: '#ff9a76',
            borderRadius: 10
          }}
        >
          일정 추가
        </Button>
      </div>

      <Card style={{ borderRadius: 15 }}>
        <Calendar cellRender={dateCellRender} />
      </Card>

      <Modal
        title="일정 추가하기"
        open={isModalVisible}
        onOk={handleAddSchedule}
        onCancel={() => {
          setIsModalVisible(false);
          setNewScheduleDate('');
          setNewScheduleContent('');
        }}
        okText="추가"
        cancelText="취소"
        okButtonProps={{ 
          style: { background: '#ff9a76', borderColor: '#ff9a76' } 
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Input
            type="date"
            value={newScheduleDate}
            onChange={(e) => setNewScheduleDate(e.target.value)}
          />
          
          <Input
            placeholder="일정 내용을 입력하세요"
            value={newScheduleContent}
            onChange={(e) => setNewScheduleContent(e.target.value)}
          />
        </Space>
      </Modal>
    </div>
  );
}
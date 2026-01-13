import React, { useState } from 'react';
import { Modal, Input, Select, DatePicker, Upload, Rate, Space, message } from 'antd';
import { PlusOutlined, HeartOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useMemoryStore } from '../store/userMemoryStore';
import type { Memory } from '../types';

const { TextArea } = Input;

interface AddMemoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddMemoryModal({ visible, onClose }: AddMemoryModalProps) {
  const addMemory = useMemoryStore((state) => state.addMemory);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    category: '데이트' as Memory['category'],
    content: '',
    date: dayjs().format('YYYY-MM-DD'),
    mood: 5,
    weather: '맑음' as Memory['weather'],
    duration: ''
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.location || !formData.content) {
      message.warning('제목, 장소, 내용은 필수입니다!');
      return;
    }

    const images: string[] = [];
    if (fileList.length > 0 && fileList[0].originFileObj) {
      const reader = new FileReader();
      reader.onloadend = () => {
        images.push(reader.result as string);
        
        const newMemory: Memory = {
          id: Date.now(),
          ...formData,
          images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400']
        };

        addMemory(newMemory);
        message.success('추억이 저장되었습니다! 💕');
        onClose();
        resetForm();
      };
      reader.readAsDataURL(fileList[0].originFileObj);
    } else {
      const newMemory: Memory = {
        id: Date.now(),
        ...formData,
        images: ['https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400']
      };

      addMemory(newMemory);
      message.success('추억이 저장되었습니다! 💕');
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      location: '',
      category: '데이트',
      content: '',
      date: dayjs().format('YYYY-MM-DD'),
      mood: 5,
      weather: '맑음',
      duration: ''
    });
    setFileList([]);
  };

  return (
    <Modal
      title={<span style={{ fontSize: 20, color: '#ff9a76' }}>💝 새로운 추억 남기기</span>}
      open={visible}
      onOk={handleSubmit}
      onCancel={() => {
        onClose();
        resetForm();
      }}
      width={600}
      okText="저장"
      cancelText="취소"
      okButtonProps={{ 
        style: { background: '#ff9a76', borderColor: '#ff9a76', height: 40 } 
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            📅 날짜
          </label>
          <DatePicker 
            style={{ width: '100%' }}
            value={dayjs(formData.date)}
            onChange={(date) => setFormData({ ...formData, date: date?.format('YYYY-MM-DD') || '' })}
            format="YYYY-MM-DD"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            ✨ 제목
          </label>
          <Input 
            placeholder="예) 첫 데이트, 100일 기념일"
            size="large"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            📍 장소
          </label>
          <Input 
            placeholder="예) 강남역 카페, 한강공원"
            size="large"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            🏷️ 카테고리
          </label>
          <Select 
            style={{ width: '100%' }}
            size="large"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            options={[
              { value: '데이트', label: '💑 데이트' },
              { value: '기념일', label: '🎉 기념일' },
              { value: '여행', label: '✈️ 여행' },
              { value: '일상', label: '☕ 일상' }
            ]}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            💭 내용
          </label>
          <TextArea
            rows={4}
            placeholder="오늘 있었던 일과 느낀 점을 자유롭게 적어주세요"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            📷 사진
          </label>
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList }) => setFileList(fileList)}
            maxCount={1}
          >
            {fileList.length === 0 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>업로드</div>
              </div>
            )}
          </Upload>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              ☀️ 날씨
            </label>
            <Select 
              style={{ width: '100%' }}
              size="large"
              value={formData.weather}
              onChange={(value) => setFormData({ ...formData, weather: value })}
              options={[
                { value: '맑음', label: '☀️ 맑음' },
                { value: '흐림', label: '☁️ 흐림' },
                { value: '비', label: '🌧️ 비' },
                { value: '눈', label: '❄️ 눈' }
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              ⏱️ 함께한 시간
            </label>
            <Input 
              placeholder="예) 3시간"
              size="large"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              💕 기분
            </label>
            <Rate 
              character={<HeartOutlined />}
              style={{ fontSize: 22, color: '#ff9a76' }}
              value={formData.mood}
              onChange={(value) => setFormData({ ...formData, mood: value })}
            />
          </div>
        </div>
      </Space>
    </Modal>
  );
}

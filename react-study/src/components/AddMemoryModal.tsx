import { useState, useRef } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useMemoryStore } from '../store/userMemoryStore';
import type { Memory } from '../types';
import { CategoryMap, WeatherMap } from '../types';
import { boardApi } from '../services/boardApi';
import { s3Api } from '../services/s3Api';

// 공통 스타일
const styles = {
  colors: {
    primary: '#ffb4a8',
    backgroundLight: '#fdfcfc',
    textDark: '#333333',
    textMuted: '#666666',
    textLight: '#999999',
    border: '#e5e5e5',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray700: '#374151',
    gray800: '#1f2937',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

interface AddMemoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddMemoryModal({ visible, onClose }: AddMemoryModalProps) {
  const addMemory = useMemoryStore((state) => state.addMemory);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    category: '데이트' as Memory['category'],
    content: '',
    date: dayjs().format('YYYY-MM-DD'),
    mood: 5,
    weather: '맑음' as Memory['weather']
  });

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!formData.content) {
      message.warning('Please enter content!');
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls: { url: string; sort: number }[] = [];

      // S3 presigned URL로 이미지 업로드
      if (selectedFile) {
        // 1. Presigned URL 발급
        const presignedUrls = await s3Api.getPresignedUrls([selectedFile.name]);

        if (presignedUrls.length > 0) {
          const { uploadUrl, finalUrl } = presignedUrls[0];

          // 2. S3에 파일 업로드
          await s3Api.uploadToS3(uploadUrl, selectedFile);

          // 3. 업로드된 이미지의 final URL 저장
          imageUrls.push({ url: finalUrl, sort: 1 });
        }
      }

      const boardData = {
        date: formData.date,
        title: formData.title || 'Untitled',
        place: formData.location || 'Unknown',
        category: CategoryMap.toServer[formData.category] || 'DATE',
        mood: formData.mood,
        content: formData.content,
        imageUrl: imageUrls,
        weather: WeatherMap.toServer[formData.weather] || 'SUNNY'
      };

      const response = await boardApi.create(boardData);

      const newMemory: Memory = {
        id: response.id ?? Date.now(),
        date: response.date,
        title: response.title,
        location: response.place,
        category: response.category as Memory['category'],
        mood: response.mood,
        content: response.content,
        images: response.imageUrl ? [response.imageUrl] : ['https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400'],
        weather: response.weather as Memory['weather']
      };

      addMemory(newMemory);
      message.success('Memory saved!');
      handleClose();
    } catch (error) {
      console.error('Save failed:', error);
      message.error('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      location: '',
      category: '데이트',
      content: '',
      date: dayjs().format('YYYY-MM-DD'),
      mood: 5,
      weather: '맑음'
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: styles.fontFamily,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'white',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: `1px solid ${styles.colors.gray100}`,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: styles.colors.textDark,
              margin: 0,
            }}
          >
            Create New Memory
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: styles.colors.gray400,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = styles.colors.gray700}
            onMouseLeave={(e) => e.currentTarget.style.color = styles.colors.gray400}
          >
            <span style={{ fontSize: 20, fontFamily: 'Material Symbols Outlined' }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Photo Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              position: 'relative',
              border: `2px dashed ${isDragging ? styles.colors.primary : styles.colors.gray200}`,
              borderRadius: 8,
              backgroundColor: isDragging ? `${styles.colors.primary}10` : styles.colors.gray50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: previewUrl ? 0 : '24px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              overflow: 'hidden',
              minHeight: previewUrl ? 160 : 'auto',
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  width: '100%',
                  height: 160,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: `${styles.colors.primary}1a`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 20, color: styles.colors.primary, fontFamily: 'Material Symbols Outlined' }}>
                    add_photo_alternate
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: styles.colors.gray700, margin: 0 }}>
                  Click or drag photo here
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a title for your memory"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                backgroundColor: 'white',
                border: `1px solid ${styles.colors.gray200}`,
                borderRadius: 6,
                outline: 'none',
                fontFamily: styles.fontFamily,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = styles.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${styles.colors.primary}30`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = styles.colors.gray200;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Date & Location Row */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  backgroundColor: 'white',
                  border: `1px solid ${styles.colors.gray200}`,
                  borderRadius: 6,
                  outline: 'none',
                  fontFamily: styles.fontFamily,
                }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Location"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  backgroundColor: 'white',
                  border: `1px solid ${styles.colors.gray200}`,
                  borderRadius: 6,
                  outline: 'none',
                  fontFamily: styles.fontFamily,
                }}
              />
            </div>
          </div>

          {/* Category & Weather Row */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Memory['category'] })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  backgroundColor: 'white',
                  border: `1px solid ${styles.colors.gray200}`,
                  borderRadius: 6,
                  outline: 'none',
                  fontFamily: styles.fontFamily,
                  cursor: 'pointer',
                }}
              >
                <option value="데이트">💕 Date</option>
                <option value="기념일">🎉 Anniversary</option>
                <option value="여행">✈️ Travel</option>
                <option value="일상">🌿 Daily</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
                Weather
              </label>
              <select
                value={formData.weather}
                onChange={(e) => setFormData({ ...formData, weather: e.target.value as Memory['weather'] })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  backgroundColor: 'white',
                  border: `1px solid ${styles.colors.gray200}`,
                  borderRadius: 6,
                  outline: 'none',
                  fontFamily: styles.fontFamily,
                  cursor: 'pointer',
                }}
              >
                <option value="맑음">☀️ Sunny</option>
                <option value="흐림">☁️ Cloudy</option>
                <option value="비">🌧️ Rainy</option>
                <option value="눈">❄️ Snowy</option>
              </select>
            </div>
          </div>

          {/* Mood */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
              Mood ({formData.mood}/5)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, mood: value })}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: value <= formData.mood ? styles.colors.primary : styles.colors.gray100,
                    color: value <= formData.mood ? 'white' : styles.colors.gray400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 18, fontFamily: 'Material Symbols Outlined', fontVariationSettings: "'FILL' 1" }}>
                    favorite
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write about your memory..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                backgroundColor: 'white',
                border: `1px solid ${styles.colors.gray200}`,
                borderRadius: 6,
                outline: 'none',
                resize: 'none',
                fontFamily: styles.fontFamily,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = styles.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${styles.colors.primary}30`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = styles.colors.gray200;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: styles.colors.gray50,
            borderTop: `1px solid ${styles.colors.gray100}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: styles.colors.gray700,
              backgroundColor: 'white',
              border: `1px solid ${styles.colors.gray200}`,
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontFamily: styles.fontFamily,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.colors.gray50}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '8px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: 'white',
              backgroundColor: styles.colors.primary,
              border: 'none',
              borderRadius: 6,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.1s',
              opacity: isSubmitting ? 0.7 : 1,
              fontFamily: styles.fontFamily,
            }}
            onMouseDown={(e) => !isSubmitting && (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

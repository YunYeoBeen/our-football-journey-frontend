import { useState, useRef, useEffect } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
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
  onCreated?: () => void | Promise<void>;
  initialDate?: string | null;
}

const MAX_IMAGES = 5;

export default function AddMemoryModal({ visible, onClose, onCreated, initialDate }: AddMemoryModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    category: '데이트' as Memory['category'],
    content: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    isSingleDay: true,
    mood: 5,
    weather: '맑음' as Memory['weather']
  });

  // Apply initialDate when modal opens
  useEffect(() => {
    if (visible && initialDate) {
      setFormData(prev => ({
        ...prev,
        startDate: initialDate,
        endDate: initialDate
      }));
    }
  }, [visible, initialDate]);

  const handleFilesSelect = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remaining = MAX_IMAGES - selectedFiles.length;
    const filesToAdd = newFiles.slice(0, remaining);

    if (filesToAdd.length > 0) {
      setSelectedFiles(prev => [...prev, ...filesToAdd]);
      const urls = filesToAdd.map(f => URL.createObjectURL(f));
      setPreviewUrls(prev => [...prev, ...urls]);
    }
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      message.warning('제목을 입력해주세요!');
      titleInputRef.current?.focus();
      return;
    }
    if (!formData.location.trim()) {
      message.warning('장소를 입력해주세요!');
      locationInputRef.current?.focus();
      return;
    }
    if (!formData.content.trim()) {
      message.warning('내용을 입력해주세요!');
      contentInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const imageKeys: string[] = [];

      // S3 presigned URL로 이미지 업로드 (다중)
      if (selectedFiles.length > 0) {
        const presignedUrls = await s3Api.getPresignedUploadUrls(selectedFiles.map(f => f.name));

        await Promise.all(presignedUrls.map(async ({ uploadUrl, key }, idx) => {
          await s3Api.uploadToS3(uploadUrl, selectedFiles[idx]);
          imageKeys.push(key);
        }));
      }

      // Validation: 종료 날짜가 시작 날짜보다 이전인지 확인
      if (!formData.isSingleDay && formData.endDate < formData.startDate) {
        message.warning('종료 날짜는 시작 날짜보다 이전일 수 없습니다!');
        return;
      }

      const boardData = {
        startDate: `${formData.startDate}T00:00:00`,
        endDate: formData.isSingleDay ? undefined : `${formData.endDate}T00:00:00`,
        title: formData.title || 'Untitled',
        place: formData.location || 'Unknown',
        category: CategoryMap.toServer[formData.category] || 'DATE',
        mood: formData.mood,
        content: formData.content,
        imageKeys: imageKeys,
        weather: WeatherMap.toServer[formData.weather] || 'SUNNY'
      };

      await boardApi.create(boardData);
      message.success('Memory saved!');
      handleClose();
      await onCreated?.();
    } catch (error) {
      // 저장 실패
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
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
      isSingleDay: true,
      mood: 5,
      weather: '맑음'
    });
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
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
          <div>
            {/* Preview Grid */}
            {previewUrls.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 8,
              }}>
                {previewUrls.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                    <img src={url} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload zone (show only if under max) */}
            {selectedFiles.length < MAX_IMAGES && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragging ? styles.colors.primary : styles.colors.gray200}`,
                  borderRadius: 8,
                  backgroundColor: isDragging ? `${styles.colors.primary}10` : styles.colors.gray50,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: `${styles.colors.primary}1a`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: 20, color: styles.colors.primary, fontFamily: 'Material Symbols Outlined' }}>
                    add_photo_alternate
                  </span>
                </div>
                <p style={{ fontSize: 12, fontWeight: 500, color: styles.colors.gray700, margin: 0 }}>
                  사진 추가 ({selectedFiles.length}/{MAX_IMAGES})
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
              제목 <span style={{ color: styles.colors.primary }}>*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="추억의 제목을 입력하세요"
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

          {/* Date Range & Location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 당일 체크박스 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="singleDay"
                checked={formData.isSingleDay}
                onChange={(e) => {
                  const isSingleDay = e.target.checked;
                  setFormData({
                    ...formData,
                    isSingleDay,
                    endDate: isSingleDay ? formData.startDate : formData.endDate
                  });
                }}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'pointer',
                  accentColor: styles.colors.primary,
                }}
              />
              <label
                htmlFor="singleDay"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: styles.colors.gray700,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                당일 이벤트
              </label>
            </div>

            {/* 날짜 필드들 */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* 시작 날짜 */}
              <div style={{
                flex: formData.isSingleDay ? '1 1 100%' : '1 1 calc(50% - 6px)',
                minWidth: 120,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
                  {formData.isSingleDay ? '날짜' : '시작 날짜'}
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setFormData({
                      ...formData,
                      startDate: newStartDate,
                      endDate: formData.isSingleDay ? newStartDate : formData.endDate
                    });
                  }}
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

              {/* 끝 날짜 (당일이 아닐 때만 표시) */}
              {!formData.isSingleDay && (
                <div style={{
                  flex: '1 1 calc(50% - 6px)',
                  minWidth: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
                    종료 날짜
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
              )}
            </div>

            {/* 장소 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500 }}>
                장소 <span style={{ color: styles.colors.primary }}>*</span>
              </label>
              <input
                ref={locationInputRef}
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="장소를 입력하세요"
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
                <option value="데이트">💕 데이트</option>
                <option value="여행">✈️ 여행</option>
                <option value="맛집">🍽️ 맛집</option>
                <option value="축구">⚽ 축구</option>
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
              내용 <span style={{ color: styles.colors.primary }}>*</span>
            </label>
            <textarea
              ref={contentInputRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="추억을 기록하세요..."
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
            disabled={isSubmitting || !formData.content.trim()}
            style={{
              padding: '8px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: 'white',
              backgroundColor: styles.colors.primary,
              border: 'none',
              borderRadius: 6,
              cursor: (isSubmitting || !formData.content.trim()) ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.1s',
              opacity: (isSubmitting || !formData.content.trim()) ? 0.5 : 1,
              fontFamily: styles.fontFamily,
            }}
            onMouseDown={(e) => !isSubmitting && formData.content.trim() && (e.currentTarget.style.transform = 'scale(0.95)')}
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

import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import imageCompression from 'browser-image-compression';
import { boardApi } from '../services/boardApi';
import type { BoardDetailResponse } from '../services/boardApi';
import ImageViewer from './ImageViewer';
import { s3Api } from '../services/s3Api';
import { CategoryMap, WeatherMap } from '../types';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

// 이미지 압축 옵션
const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

const styles = {
  colors: {
    primary: '#ffb4a8',
    backgroundLight: '#fdfcfc',
    textDark: '#333333',
    textMuted: '#666666',
    textLight: '#999999',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray700: '#374151',
    danger: '#ef4444',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

const categoryEmoji: Record<string, string> = {
  '데이트': '💕',
  '여행': '✈️',
  '맛집': '🍽️',
  '축구': '⚽',
  'DATE': '💕',
  'TRAVEL': '✈️',
  'FOOD': '🍽️',
  'FOOTBALL': '⚽',
};

const weatherEmoji: Record<string, string> = {
  '맑음': '☀️',
  '흐림': '☁️',
  '비': '🌧️',
  '눈': '❄️',
  'SUNNY': '☀️',
  'CLOUD': '☁️',
  'RAIN': '🌧️',
  'SNOW': '❄️',
};

const categories = ['데이트', '여행', '맛집', '축구'];
const weathers = ['맑음', '흐림', '비', '눈'];

interface MemoryDetailModalProps {
  visible: boolean;
  boardId: number | null;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
}

export default function MemoryDetailModal({ visible, boardId, onClose, onDeleted, onUpdated }: MemoryDetailModalProps) {
  const [detail, setDetail] = useState<BoardDetailResponse | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    place: '',
    category: '',
    weather: '',
    content: '',
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [deletedImageKeys, setDeletedImageKeys] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 스와이프 핸들러
  const handleImagePrevious = useCallback(() => {
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : imageUrls.length - 1);
  }, [imageUrls.length]);

  const handleImageNext = useCallback(() => {
    setCurrentImageIndex(prev => prev < imageUrls.length - 1 ? prev + 1 : 0);
  }, [imageUrls.length]);

  const imageSwipeHandlers = useSwipeGesture({
    onSwipeLeft: handleImageNext,
    onSwipeRight: handleImagePrevious,
    threshold: 50,
  });

  useEffect(() => {
    if (visible && boardId) {
      fetchDetail(boardId);
      setIsEditMode(false);
      setShowDeleteConfirm(false);
    }
  }, [visible, boardId]);

  const fetchDetail = async (id: number) => {
    try {
      setLoading(true);
      const response = await boardApi.getDetail(id);
      setDetail(response);
      setCurrentImageIndex(0);

      // Initialize edit form (서버 영문값 → 한글로 변환)
      setEditForm({
        title: response.title,
        startDate: response.startDate,
        endDate: response.endDate || response.startDate,
        place: response.place,
        category: CategoryMap.toClient[response.category] || response.category,
        weather: WeatherMap.toClient[response.weather] || response.weather,
        content: response.content,
      });
      setDeletedImageKeys([]);
      setNewImages([]);
      setNewImagePreviews([]);

      if (response.images && response.images.length > 0) {
        const urls = await s3Api.getPresignedViewUrls(response.images);
        setImageUrls(urls);
      } else {
        setImageUrls([]);
      }
    } catch {
      // 상세 조회 실패
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDetail(null);
    setImageUrls([]);
    setIsEditMode(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!boardId) return;

    try {
      setIsDeleting(true);
      await boardApi.delete(boardId);
      message.success('Memory deleted!');
      if (onDeleted) {
        await onDeleted();
      }
      handleClose();
    } catch {
      message.error('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setNewImages(prev => [...prev, ...newFiles]);

      // Create previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setNewImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveExistingImage = (imageKey: string) => {
    setDeletedImageKeys(prev => [...prev, imageKey]);
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!boardId || !detail) return;

    try {
      setIsSaving(true);

      // Calculate kept images
      const keepImageKeys = detail.images.filter(key => !deletedImageKeys.includes(key));

      // Upload new images (압축 후)
      const addImageFileNames: string[] = [];
      if (newImages.length > 0) {
        // 이미지 압축
        const compressedFiles = await Promise.all(
          newImages.map(async (file) => {
            try {
              const compressed = await imageCompression(file, compressionOptions);
              return compressed;
            } catch {
              console.warn(`압축 실패, 원본 사용: ${file.name}`);
              return file;
            }
          })
        );

        const presignedUrls = await s3Api.getPresignedUploadUrls(newImages.map(f => f.name));
        for (let i = 0; i < presignedUrls.length; i++) {
          await s3Api.uploadToS3(presignedUrls[i].uploadUrl, compressedFiles[i]);
          addImageFileNames.push(presignedUrls[i].key);
        }
      }

      // 날짜에서 시간 부분만 추출하거나 T00:00:00 추가
      const formatDate = (dateStr: string) => {
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0] + 'T00:00:00';
        }
        return dateStr + 'T00:00:00';
      };

      await boardApi.update(boardId, {
        title: editForm.title,
        startDate: formatDate(editForm.startDate),
        endDate: editForm.endDate === editForm.startDate ? undefined : formatDate(editForm.endDate),
        place: editForm.place,
        category: CategoryMap.toServer[editForm.category] || editForm.category,
        weather: WeatherMap.toServer[editForm.weather] || editForm.weather,
        content: editForm.content,
        keepImageKeys,
        addImageFileNames,
        deleteImageKeys: deletedImageKeys,
      });

      message.success('Memory updated!');
      setIsEditMode(false);
      await fetchDetail(boardId);
      if (onUpdated) {
        await onUpdated();
      }
    } catch {
      message.error('Failed to update. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!visible) return null;

  // Get displayable images (existing - deleted + new previews)
  const displayImages = detail ? [
    ...detail.images
      .map((key, idx) => ({ type: 'existing' as const, key, url: imageUrls[idx], deleted: deletedImageKeys.includes(key) }))
      .filter(img => !img.deleted),
    ...newImagePreviews.map((url, idx) => ({ type: 'new' as const, url, idx }))
  ] : [];

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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <span
              style={{
                fontSize: 32,
                color: styles.colors.primary,
                fontFamily: 'Material Symbols Outlined',
                animation: 'pulse 1.5s infinite',
              }}
            >
              favorite
            </span>
            <p style={{ color: styles.colors.textMuted, marginTop: 12 }}>Loading...</p>
          </div>
        ) : detail ? (
          <>
            {/* Image Section */}
            {(imageUrls.length > 0 || (isEditMode && (displayImages.length > 0 || newImagePreviews.length > 0))) && (
              <div style={{ position: 'relative' }}>
                {isEditMode ? (
                  // Edit mode: show all images with delete option
                  <div style={{ position: 'relative', height: 280, backgroundColor: styles.colors.gray100 }}>
                    {displayImages.length > 0 ? (
                      <>
                        <img
                          src={displayImages[currentImageIndex]?.url}
                          alt={detail.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Delete current image button */}
                        <button
                          onClick={() => {
                            const img = displayImages[currentImageIndex];
                            if (img.type === 'existing') {
                              handleRemoveExistingImage(img.key);
                            } else {
                              handleRemoveNewImage(img.idx);
                            }
                            if (currentImageIndex >= displayImages.length - 1) {
                              setCurrentImageIndex(Math.max(0, displayImages.length - 2));
                            }
                          }}
                          style={{
                            position: 'absolute',
                            bottom: 48,
                            right: 12,
                            padding: '6px 12px',
                            backgroundColor: styles.colors.danger,
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>delete</span>
                          Remove
                        </button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <p style={{ color: styles.colors.textMuted }}>No images</p>
                      </div>
                    )}
                    {/* Add image button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        padding: '6px 12px',
                        backgroundColor: styles.colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>add_photo_alternate</span>
                      Add Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    {/* Navigation dots for edit mode */}
                    {displayImages.length > 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: 6,
                        }}
                      >
                        {displayImages.map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: idx === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                              cursor: 'pointer',
                            }}
                            onClick={() => setCurrentImageIndex(idx)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // View mode
                  <>
                    <img
                      src={imageUrls[currentImageIndex]}
                      alt={detail.title}
                      onClick={() => {
                        setImageViewerIndex(currentImageIndex);
                        setImageViewerVisible(true);
                      }}
                      {...imageSwipeHandlers}
                      style={{
                        width: '100%',
                        height: 280,
                        objectFit: 'cover',
                        cursor: 'pointer',
                        touchAction: 'pan-y',
                      }}
                    />
                    {/* Image Navigation */}
                    {imageUrls.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : imageUrls.length - 1)}
                          style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20 }}>chevron_left</span>
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(prev => prev < imageUrls.length - 1 ? prev + 1 : 0)}
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20 }}>chevron_right</span>
                        </button>
                        {/* Dots */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: 6,
                          }}
                        >
                          {imageUrls.map((_, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: idx === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                              }}
                              onClick={() => setCurrentImageIndex(idx)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
                {/* Close Button */}
                <button
                  onClick={handleClose}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20 }}>close</span>
                </button>
              </div>
            )}

            {/* Content Section */}
            <div style={{ padding: 24, overflowY: 'auto' }}>
              {isEditMode ? (
                // Edit Mode
                <>
                  {/* Title */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${styles.colors.gray200}`,
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Start Date & End Date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {/* 시작 날짜 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: styles.colors.gray500,
                        minWidth: 60,
                        flexShrink: 0,
                      }}>
                        시작
                      </label>
                      <input
                        type="date"
                        value={editForm.startDate.split('T')[0]}
                        onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          fontSize: 15,
                          backgroundColor: 'white',
                          border: `1px solid ${styles.colors.gray200}`,
                          borderRadius: 8,
                          outline: 'none',
                          boxSizing: 'border-box',
                          minWidth: 0,
                        }}
                      />
                    </div>
                    {/* 종료 날짜 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: styles.colors.gray500,
                        minWidth: 60,
                        flexShrink: 0,
                      }}>
                        종료
                      </label>
                      <input
                        type="date"
                        value={editForm.endDate.split('T')[0]}
                        min={editForm.startDate.split('T')[0]}
                        onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          fontSize: 15,
                          backgroundColor: 'white',
                          border: `1px solid ${styles.colors.gray200}`,
                          borderRadius: 8,
                          outline: 'none',
                          boxSizing: 'border-box',
                          minWidth: 0,
                        }}
                      />
                    </div>
                  </div>

                  {/* Place */}
                  <div style={{ marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>
                        Place
                      </label>
                      <input
                        type="text"
                        value={editForm.place}
                        onChange={(e) => setEditForm(prev => ({ ...prev, place: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${styles.colors.gray200}`,
                          borderRadius: 8,
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Category & Weather */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>
                        Category
                      </label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${styles.colors.gray200}`,
                          borderRadius: 8,
                          fontSize: 14,
                          outline: 'none',
                          backgroundColor: 'white',
                        }}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{categoryEmoji[cat]} {cat}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>
                        Weather
                      </label>
                      <select
                        value={editForm.weather}
                        onChange={(e) => setEditForm(prev => ({ ...prev, weather: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${styles.colors.gray200}`,
                          borderRadius: 8,
                          fontSize: 14,
                          outline: 'none',
                          backgroundColor: 'white',
                        }}
                      >
                        {weathers.map(w => (
                          <option key={w} value={w}>{weatherEmoji[w]} {w}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>
                      Content
                    </label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${styles.colors.gray200}`,
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Save/Cancel buttons */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => {
                        setIsEditMode(false);
                        setDeletedImageKeys([]);
                        setNewImages([]);
                        setNewImagePreviews([]);
                        if (detail) {
                          setEditForm({
                            title: detail.title,
                            startDate: detail.startDate,
                            endDate: detail.endDate || detail.startDate,
                            place: detail.place,
                            category: CategoryMap.toClient[detail.category] || detail.category,
                            weather: WeatherMap.toClient[detail.weather] || detail.weather,
                            content: detail.content,
                          });
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        backgroundColor: styles.colors.gray100,
                        color: styles.colors.gray700,
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        backgroundColor: styles.colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        opacity: isSaving ? 0.7 : 1,
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              ) : (
                // View Mode
                <>
                  {/* Header */}
                  <div style={{ marginBottom: 16 }}>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: styles.colors.textDark,
                        margin: 0,
                        marginBottom: 8,
                      }}
                    >
                      {detail.title}
                    </h2>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, color: styles.colors.textMuted }}>
                        📅 {detail.endDate && detail.startDate !== detail.endDate ? `${detail.startDate.split('T')[0]} - ${detail.endDate.split('T')[0]}` : detail.startDate.split('T')[0]}
                      </span>
                      <span style={{ fontSize: 14, color: styles.colors.textMuted }}>
                        📍 {detail.place}
                      </span>
                      {detail.writer && (
                        <span style={{ fontSize: 14, color: styles.colors.textMuted }}>
                          ✍️ {detail.writer}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        backgroundColor: `${styles.colors.primary}20`,
                        color: styles.colors.primary,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {categoryEmoji[detail.category] || '📝'} {detail.category}
                    </span>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        backgroundColor: styles.colors.gray100,
                        color: styles.colors.gray700,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {weatherEmoji[detail.weather] || '🌤️'} {detail.weather}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 8 }}>
                      Content
                    </p>
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.7,
                        color: styles.colors.textDark,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {detail.content}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {showDeleteConfirm ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <p style={{ flex: 1, fontSize: 14, color: styles.colors.danger, margin: 0 }}>
                        Delete this memory?
                      </p>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: styles.colors.gray100,
                          color: styles.colors.gray700,
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: styles.colors.danger,
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          opacity: isDeleting ? 0.7 : 1,
                        }}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => setIsEditMode(true)}
                        style={{
                          flex: 1,
                          padding: '12px 24px',
                          backgroundColor: styles.colors.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18 }}>edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: styles.colors.gray100,
                          color: styles.colors.danger,
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20 }}>delete</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <p style={{ color: styles.colors.textMuted }}>Failed to load memory</p>
            <button
              onClick={handleClose}
              style={{
                marginTop: 16,
                padding: '8px 24px',
                backgroundColor: styles.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <ImageViewer
        images={imageUrls}
        initialIndex={imageViewerIndex}
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

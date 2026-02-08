import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import imageCompression from 'browser-image-compression';
import { boardApi } from '../services/boardApi';
import type { BoardDetailResponse } from '../services/boardApi';
import ImageViewer from './ImageViewer';
import { s3Api } from '../services/s3Api';
import { CategoryMap, WeatherMap } from '../types';
import type { CommentResponseDto } from '../types';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useAuthStore } from '../store/userAuthStore';
import CommentSection from './comment/CommentSection';

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
  '데이트': '💕', '여행': '✈️', '맛집': '🍽️', '축구': '⚽', '일상': '📝',
  'DATE': '💕', 'TRAVEL': '✈️', 'FOOD': '🍽️', 'FOOTBALL': '⚽', 'DAILY': '📝',
};

const weatherEmoji: Record<string, string> = {
  '맑음': '☀️', '흐림': '☁️', '비': '🌧️', '눈': '❄️',
  'SUNNY': '☀️', 'CLOUDY': '☁️', 'RAINY': '🌧️', 'SNOW': '❄️',
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
  const { user } = useAuthStore();
  const [detail, setDetail] = useState<BoardDetailResponse | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [comments, setComments] = useState<CommentResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  const [editForm, setEditForm] = useState({
    title: '', startDate: '', endDate: '', place: '', category: '', weather: '', content: '',
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [deletedImageKeys, setDeletedImageKeys] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 반응형 처리
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      // 댓글 목록 설정
      if (response.commentList) {
        setComments(response.commentList.map(c => ({
          commentId: c.commentId,
          userName: c.userName,
          content: c.content,
          createdAt: c.createdAt,
          childCount: c.childCount,
        })));
      } else {
        setComments([]);
      }

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
    setComments([]);
    setIsEditMode(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!boardId) return;
    try {
      setIsDeleting(true);
      await boardApi.delete(boardId);
      message.success('삭제되었습니다!');
      if (onDeleted) await onDeleted();
      handleClose();
    } catch {
      message.error('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setNewImages(prev => [...prev, ...newFiles]);
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
      const keepImageKeys = detail.images.filter(key => !deletedImageKeys.includes(key));
      const addImageFileNames: string[] = [];

      if (newImages.length > 0) {
        const compressedFiles = await Promise.all(
          newImages.map(async (file) => {
            try {
              return await imageCompression(file, compressionOptions);
            } catch {
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

      const formatDate = (dateStr: string) => {
        if (dateStr.includes('T')) return dateStr.split('T')[0] + 'T00:00:00';
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

      message.success('수정되었습니다!');
      setIsEditMode(false);
      await fetchDetail(boardId);
      if (onUpdated) await onUpdated();
    } catch {
      message.error('수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommentsChange = () => {
    if (boardId) fetchDetail(boardId);
  };

  if (!visible) return null;

  const displayImages = detail ? [
    ...detail.images
      .map((key, idx) => ({ type: 'existing' as const, key, url: imageUrls[idx], deleted: deletedImageKeys.includes(key) }))
      .filter(img => !img.deleted),
    ...newImagePreviews.map((url, idx) => ({ type: 'new' as const, url, idx }))
  ] : [];

  const currentUserName = user?.name || '';

  // 이미지 섹션 렌더링
  const renderImageSection = () => (
    <div
      style={{
        position: 'relative',
        width: isDesktop ? '55%' : '100%',
        height: isDesktop ? '100%' : 280,
        backgroundColor: '#000',
        flexShrink: 0,
      }}
    >
      {isEditMode ? (
        <div style={{ position: 'relative', height: '100%', backgroundColor: styles.colors.gray100 }}>
          {displayImages.length > 0 ? (
            <>
              <img
                src={displayImages[currentImageIndex]?.url}
                alt={detail?.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => {
                  const img = displayImages[currentImageIndex];
                  if (img.type === 'existing') handleRemoveExistingImage(img.key);
                  else handleRemoveNewImage(img.idx);
                  if (currentImageIndex >= displayImages.length - 1) {
                    setCurrentImageIndex(Math.max(0, displayImages.length - 2));
                  }
                }}
                style={{
                  position: 'absolute', bottom: 48, right: 12, padding: '6px 12px',
                  backgroundColor: styles.colors.danger, color: 'white', border: 'none',
                  borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>delete</span>
                삭제
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ color: styles.colors.textMuted }}>이미지 없음</p>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'absolute', bottom: 12, right: 12, padding: '6px 12px',
              backgroundColor: styles.colors.primary, color: 'white', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>add_photo_alternate</span>
            사진 추가
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
          {displayImages.length > 1 && (
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
              {displayImages.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                    backgroundColor: idx === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                  }}
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>
      ) : imageUrls.length > 0 ? (
        <>
          <img
            src={imageUrls[currentImageIndex]}
            alt={detail?.title}
            onClick={() => { setImageViewerIndex(currentImageIndex); setImageViewerVisible(true); }}
            {...imageSwipeHandlers}
            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', touchAction: 'pan-y' }}
          />
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : imageUrls.length - 1)}
                style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.9)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20 }}>chevron_left</span>
              </button>
              <button
                onClick={() => setCurrentImageIndex(prev => prev < imageUrls.length - 1 ? prev + 1 : 0)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.9)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20 }}>chevron_right</span>
              </button>
              <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                {imageUrls.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                      backgroundColor: idx === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                    }}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: styles.colors.gray100 }}>
          <p style={{ color: styles.colors.textMuted }}>이미지 없음</p>
        </div>
      )}
      {/* 닫기 버튼 (모바일에서만) */}
      {!isDesktop && (
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%',
            border: 'none', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 20 }}>close</span>
        </button>
      )}
    </div>
  );

  // 콘텐츠 헤더 (View Mode)
  const renderContentHeader = () => (
    <div style={{ padding: 16, borderBottom: `1px solid ${styles.colors.gray100}` }}>
      {/* 닫기 버튼 (데스크톱) */}
      {isDesktop && (
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
            border: 'none', backgroundColor: styles.colors.gray100, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}
        >
          <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18, color: styles.colors.textMuted }}>close</span>
        </button>
      )}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: styles.colors.textDark, margin: 0, marginBottom: 8, paddingRight: isDesktop ? 40 : 0 }}>
        {detail?.title}
      </h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13, color: styles.colors.textMuted, marginBottom: 8 }}>
        <span>📅 {detail?.endDate && detail?.startDate !== detail?.endDate ? `${detail?.startDate.split('T')[0]} - ${detail?.endDate.split('T')[0]}` : detail?.startDate.split('T')[0]}</span>
        <span>📍 {detail?.place}</span>
        {detail?.writer && <span>✍️ {detail?.writer}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ padding: '3px 10px', borderRadius: 16, backgroundColor: `${styles.colors.primary}20`, color: styles.colors.primary, fontSize: 12, fontWeight: 500 }}>
          {categoryEmoji[detail?.category || ''] || '📝'} {detail?.category}
        </span>
        <span style={{ padding: '3px 10px', borderRadius: 16, backgroundColor: styles.colors.gray100, color: styles.colors.gray700, fontSize: 12, fontWeight: 500 }}>
          {weatherEmoji[detail?.weather || ''] || '🌤️'} {detail?.weather}
        </span>
      </div>
      {/* 본문 내용 */}
      <p style={{ fontSize: 14, lineHeight: 1.6, color: styles.colors.textDark, margin: '12px 0 0 0', whiteSpace: 'pre-wrap' }}>
        {detail?.content}
      </p>
      {/* 수정/삭제 버튼 */}
      {!showDeleteConfirm ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setIsEditMode(true)}
            style={{
              padding: '8px 16px', backgroundColor: styles.colors.primary, color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>edit</span>
            수정
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '8px 12px', backgroundColor: styles.colors.gray100, color: styles.colors.danger,
              border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18 }}>delete</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <p style={{ flex: 1, fontSize: 13, color: styles.colors.danger, margin: 0 }}>삭제하시겠습니까?</p>
          <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '6px 12px', backgroundColor: styles.colors.gray100, color: styles.colors.gray700, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>취소</button>
          <button onClick={handleDelete} disabled={isDeleting} style={{ padding: '6px 12px', backgroundColor: styles.colors.danger, color: 'white', border: 'none', borderRadius: 6, cursor: isDeleting ? 'not-allowed' : 'pointer', fontSize: 13, opacity: isDeleting ? 0.7 : 1 }}>{isDeleting ? '삭제 중...' : '삭제'}</button>
        </div>
      )}
    </div>
  );

  // 수정 모드 폼
  const renderEditForm = () => (
    <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
      {isDesktop && (
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
            border: 'none', backgroundColor: styles.colors.gray100, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}
        >
          <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18, color: styles.colors.textMuted }}>close</span>
        </button>
      )}
      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>제목</label>
        <input type="text" value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${styles.colors.gray200}`, borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {/* Dates */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>시작</label>
          <input type="date" value={editForm.startDate.split('T')[0]} onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${styles.colors.gray200}`, borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>종료</label>
          <input type="date" value={editForm.endDate.split('T')[0]} min={editForm.startDate.split('T')[0]} onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${styles.colors.gray200}`, borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>
      {/* Place */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>장소</label>
        <input type="text" value={editForm.place} onChange={(e) => setEditForm(prev => ({ ...prev, place: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${styles.colors.gray200}`, borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {/* Category & Weather */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>카테고리</label>
          <select value={editForm.category} onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${styles.colors.gray200}`, borderRadius: 6, fontSize: 14, outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}>
            {categories.map(cat => <option key={cat} value={cat}>{categoryEmoji[cat]} {cat}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>날씨</label>
          <select value={editForm.weather} onChange={(e) => setEditForm(prev => ({ ...prev, weather: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${styles.colors.gray200}`, borderRadius: 6, fontSize: 14, outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}>
            {weathers.map(w => <option key={w} value={w}>{weatherEmoji[w]} {w}</option>)}
          </select>
        </div>
      </div>
      {/* Content */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: styles.colors.gray500, marginBottom: 4, display: 'block' }}>내용</label>
        <textarea value={editForm.content} onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))} rows={4}
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${styles.colors.gray200}`, borderRadius: 6, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            setIsEditMode(false);
            setDeletedImageKeys([]);
            setNewImages([]);
            setNewImagePreviews([]);
            if (detail) {
              setEditForm({
                title: detail.title, startDate: detail.startDate, endDate: detail.endDate || detail.startDate,
                place: detail.place, category: CategoryMap.toClient[detail.category] || detail.category,
                weather: WeatherMap.toClient[detail.weather] || detail.weather, content: detail.content,
              });
            }
          }}
          style={{ flex: 1, padding: '10px 16px', backgroundColor: styles.colors.gray100, color: styles.colors.gray700, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >취소</button>
        <button onClick={handleSave} disabled={isSaving}
          style={{ flex: 1, padding: '10px 16px', backgroundColor: styles.colors.primary, color: 'white', border: 'none', borderRadius: 6, cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: isSaving ? 0.7 : 1 }}
        >{isSaving ? '저장 중...' : '저장'}</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: styles.fontFamily }}>
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }} />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isDesktop ? 900 : 480,
          height: isDesktop ? '80vh' : '90vh',
          maxHeight: '90vh',
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', width: '100%' }}>
            <span style={{ fontSize: 32, color: styles.colors.primary, fontFamily: 'Material Symbols Outlined', animation: 'pulse 1.5s infinite' }}>favorite</span>
            <p style={{ color: styles.colors.textMuted, marginTop: 12 }}>로딩 중...</p>
          </div>
        ) : detail ? (
          <>
            {/* 이미지 섹션 */}
            {(imageUrls.length > 0 || isEditMode) && renderImageSection()}

            {/* 콘텐츠 + 댓글 섹션 */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {isEditMode ? (
                renderEditForm()
              ) : (
                <>
                  {renderContentHeader()}
                  {/* 댓글 섹션 */}
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    <CommentSection
                      boardId={boardId!}
                      comments={comments}
                      currentUserName={currentUserName}
                      onCommentsChange={handleCommentsChange}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 60, textAlign: 'center', width: '100%' }}>
            <p style={{ color: styles.colors.textMuted }}>불러오기 실패</p>
            <button onClick={handleClose} style={{ marginTop: 16, padding: '8px 24px', backgroundColor: styles.colors.primary, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>닫기</button>
          </div>
        )}
      </div>

      <ImageViewer images={imageUrls} initialIndex={imageViewerIndex} visible={imageViewerVisible} onClose={() => setImageViewerVisible(false)} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

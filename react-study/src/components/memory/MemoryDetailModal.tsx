import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import imageCompression from 'browser-image-compression';
import { boardApi } from '../../services/boardApi';
import type { BoardDetailResponse } from '../../services/boardApi';
import ImageViewer from './ImageViewer';
import { s3Api } from '../../services/s3Api';
import { CategoryMap, WeatherMap } from '../../types';
import type { CommentResponseDto } from '../../types';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useAuthStore } from '../../store/userAuthStore';
import CommentModal from '../comment/CommentModal';
import NaverMapPickerModal from '../common/NaverMapPickerModal';
import '../../styles/MemoryDetailModal.css';

const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

const categoryEmoji: Record<string, string> = {
  '데이트': '💕', '여행': '✈️', '맛집': '🍽️', '축구': '⚽', '일상': '📝',
  'DATE': '💕', 'TRAVEL': '✈️', 'FOOD': '🍽️', 'FOOTBALL': '⚽', 'DAILY': '📝',
};

const weatherEmoji: Record<string, string> = {
  '맑음': '☀️', '흐림': '☁️', '비': '🌧️', '눈': '❄️',
  'SUNNY': '☀️', 'CLOUDY': '☁️', 'RAINY': '🌧️', 'SNOW': '❄️',
};

const categories = ['데이트', '여행', '맛집', '축구', '일상'];
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
  const [commentModalVisible, setCommentModalVisible] = useState(false);

  const [editForm, setEditForm] = useState({
    title: '', startDate: '', endDate: '', place: '', category: '', weather: '', content: '',
  });
  const [editLocationCoords, setEditLocationCoords] = useState<{
    latitude: number | null; longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [deletedImageKeys, setDeletedImageKeys] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      if (response.commentList) {
        setComments(response.commentList.map(c => ({
          commentId: c.commentId,
          userName: c.userName,
          profileUrl: c.profileUrl,
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
      setEditLocationCoords({
        latitude: response.latitude ?? null,
        longitude: response.longitude ?? null,
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
    } catch { /* 상세 조회 실패 */ }
    finally { setLoading(false); }
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
        reader.onload = (e) => setNewImagePreviews(prev => [...prev, e.target?.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveExistingImage = (imageKey: string) => setDeletedImageKeys(prev => [...prev, imageKey]);
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
            try { return await imageCompression(file, compressionOptions); }
            catch { return file; }
          })
        );
        const presignedUrls = await s3Api.getPresignedUploadUrls(newImages.map(f => f.name));
        for (let i = 0; i < presignedUrls.length; i++) {
          await s3Api.uploadToS3(presignedUrls[i].uploadUrl, compressedFiles[i]);
          addImageFileNames.push(presignedUrls[i].key);
        }
      }

      const formatDate = (dateStr: string) => dateStr.includes('T') ? dateStr.split('T')[0] + 'T00:00:00' : dateStr + 'T00:00:00';

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
        ...(editLocationCoords.latitude != null && editLocationCoords.longitude != null && {
          latitude: editLocationCoords.latitude,
          longitude: editLocationCoords.longitude,
        }),
      });

      message.success('수정되었습니다!');
      await fetchDetail(boardId);
      setIsEditMode(false);
      if (onUpdated) await onUpdated();
    } catch {
      message.error('수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommentsChange = () => { if (boardId) fetchDetail(boardId); };

  if (!visible) return null;

  const displayImages = detail ? [
    ...detail.images
      .map((key, idx) => ({ type: 'existing' as const, key, url: imageUrls[idx], deleted: deletedImageKeys.includes(key) }))
      .filter(img => !img.deleted),
    ...newImagePreviews.map((url, idx) => ({ type: 'new' as const, url, idx }))
  ] : [];

  const currentUserName = user?.name || '';

  const renderImageSection = () => (
    <div className={`memory-detail-image-section ${isDesktop ? 'memory-detail-image-section--desktop' : 'memory-detail-image-section--mobile'} ${isEditMode ? 'memory-detail-image-section--edit' : ''}`}>
      {isEditMode ? (
        <div style={{ position: 'relative', height: '100%' }}>
          {displayImages.length > 0 ? (
            <>
              <img src={displayImages[currentImageIndex]?.url} alt={detail?.title} className="memory-detail-image" />
              <button
                onClick={() => {
                  const img = displayImages[currentImageIndex];
                  if (img.type === 'existing') handleRemoveExistingImage(img.key);
                  else handleRemoveNewImage(img.idx);
                  if (currentImageIndex >= displayImages.length - 1) setCurrentImageIndex(Math.max(0, displayImages.length - 2));
                }}
                className="memory-detail-edit-image-delete-btn"
              >
                <span className="icon">delete</span>삭제
              </button>
            </>
          ) : (
            <div className="memory-detail-image-empty"><p className="memory-detail-image-empty-text">이미지 없음</p></div>
          )}
          <button onClick={() => fileInputRef.current?.click()} className="memory-detail-edit-image-add-btn">
            <span className="icon">add_photo_alternate</span>사진 추가
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
          {displayImages.length > 1 && (
            <div className="memory-detail-image-dots">
              {displayImages.map((_, idx) => (
                <div key={idx} className={`memory-detail-image-dot ${idx === currentImageIndex ? 'memory-detail-image-dot--active' : 'memory-detail-image-dot--inactive'}`} onClick={() => setCurrentImageIndex(idx)} />
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
            className="memory-detail-image"
          />
          {imageUrls.length > 1 && (
            <>
              <button onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : imageUrls.length - 1)} className="memory-detail-image-nav-btn memory-detail-image-nav-btn--left">
                <span className="memory-detail-image-nav-icon">chevron_left</span>
              </button>
              <button onClick={() => setCurrentImageIndex(prev => prev < imageUrls.length - 1 ? prev + 1 : 0)} className="memory-detail-image-nav-btn memory-detail-image-nav-btn--right">
                <span className="memory-detail-image-nav-icon">chevron_right</span>
              </button>
              <div className="memory-detail-image-dots">
                {imageUrls.map((_, idx) => (
                  <div key={idx} className={`memory-detail-image-dot ${idx === currentImageIndex ? 'memory-detail-image-dot--active' : 'memory-detail-image-dot--inactive'}`} onClick={() => setCurrentImageIndex(idx)} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="memory-detail-image-empty"><p className="memory-detail-image-empty-text">이미지 없음</p></div>
      )}
      {!isDesktop && (
        <button onClick={handleClose} className="memory-detail-close-btn memory-detail-close-btn--mobile">
          <span className="memory-detail-close-icon">close</span>
        </button>
      )}
    </div>
  );

  const renderContentHeader = () => (
    <div className="memory-detail-content-inner" style={{ paddingRight: isDesktop ? 40 : undefined }}>
      {isDesktop && (
        <button onClick={handleClose} className="memory-detail-close-btn memory-detail-close-btn--desktop">
          <span className="memory-detail-close-icon memory-detail-close-icon--small">close</span>
        </button>
      )}
      <h2 className="memory-detail-title">{detail?.title}</h2>
      <div className="memory-detail-meta">
        <div className="memory-detail-date-wrapper">
          <div className="memory-detail-calendar-icon">
            <div className="memory-detail-calendar-header"></div>
            <span className="memory-detail-calendar-number">
              {detail?.startDate ? new Date(detail.startDate).getDate() : 1}
            </span>
          </div>
          <span>
            {detail?.endDate && detail?.startDate !== detail?.endDate
              ? `${detail?.startDate.split('T')[0]} - ${detail?.endDate.split('T')[0]}`
              : detail?.startDate.split('T')[0]}
          </span>
        </div>
        <span>📍 {detail?.place}</span>
        {detail?.writer && <span>✍️ {detail?.writer}</span>}
      </div>
      <div className="memory-detail-tags">
        <span className="memory-detail-tag memory-detail-tag--category">{categoryEmoji[detail?.category || ''] || '📝'} {detail?.category}</span>
        <span className="memory-detail-tag memory-detail-tag--weather">{weatherEmoji[detail?.weather || ''] || '🌤️'} {detail?.weather}</span>
      </div>
      <p className="memory-detail-body">{detail?.content}</p>
      {detail?.latitude != null && detail?.longitude != null && NAVER_MAP_CLIENT_ID && (
        <div className="memory-detail-map">
          <img
            src={`https://maps.apigw.ntruss.com/map-static/v2/raster-cors?w=600&h=200&scale=2&center=${detail.longitude},${detail.latitude}&level=16&markers=type:d|size:mid|pos:${detail.longitude}%20${detail.latitude}&X-NCP-APIGW-API-KEY-ID=${NAVER_MAP_CLIENT_ID}`}
            alt="위치 지도"
            className="memory-detail-map-image"
            loading="lazy"
          />
        </div>
      )}
      {!showDeleteConfirm ? (
        <div className="memory-detail-actions">
          <button onClick={() => setIsEditMode(true)} className="memory-detail-edit-btn">
            <span className="icon">edit</span>수정
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="memory-detail-delete-btn">
            <span className="icon">delete</span>
          </button>
        </div>
      ) : (
        <div className="memory-detail-delete-confirm">
          <p className="memory-detail-delete-confirm-text">삭제하시겠습니까?</p>
          <button onClick={() => setShowDeleteConfirm(false)} className="memory-detail-delete-cancel-btn">취소</button>
          <button onClick={handleDelete} disabled={isDeleting} className="memory-detail-delete-confirm-btn">{isDeleting ? '삭제 중...' : '삭제'}</button>
        </div>
      )}
      <button onClick={() => setCommentModalVisible(true)} className="memory-detail-comment-btn">
        <span className="icon">chat_bubble_outline</span>
        {comments.length > 0 ? `댓글 ${comments.length}개 보기` : '댓글 작성하기'}
      </button>
    </div>
  );

  const renderEditForm = () => (
    <div className="memory-detail-edit-form">
      {isDesktop && (
        <button onClick={handleClose} className="memory-detail-close-btn memory-detail-close-btn--desktop">
          <span className="memory-detail-close-icon memory-detail-close-icon--small">close</span>
        </button>
      )}
      <div className="memory-detail-form-group">
        <label className="memory-detail-form-label">제목</label>
        <input type="text" value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} className="memory-detail-form-input" />
      </div>
      <div className="memory-detail-date-row">
        <div className="memory-detail-date-item">
          <label className="memory-detail-date-label">시작</label>
          <input type="date" value={editForm.startDate.split('T')[0]} onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))} className="memory-detail-date-input" />
        </div>
        <div className="memory-detail-date-item">
          <label className="memory-detail-date-label">종료</label>
          <input type="date" value={editForm.endDate.split('T')[0]} min={editForm.startDate.split('T')[0]} onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))} className="memory-detail-date-input" />
        </div>
      </div>
      <div className="memory-detail-form-group">
        <label className="memory-detail-form-label">장소</label>
        <div className="memory-detail-place-row">
          <input
            type="text"
            value={editForm.place}
            onChange={(e) => {
              setEditForm(prev => ({ ...prev, place: e.target.value }));
              if (editLocationCoords.latitude !== null) setEditLocationCoords({ latitude: null, longitude: null });
            }}
            className="memory-detail-form-input"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button type="button" onClick={() => setIsMapPickerOpen(true)} className="memory-detail-map-btn">
            <span className="icon">location_on</span>지도
          </button>
        </div>
      </div>
      <div className="memory-detail-form-row">
        <div>
          <label className="memory-detail-form-label">카테고리</label>
          <select value={editForm.category} onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))} className="memory-detail-form-select">
            {categories.map(cat => <option key={cat} value={cat}>{categoryEmoji[cat]} {cat}</option>)}
          </select>
        </div>
        <div>
          <label className="memory-detail-form-label">날씨</label>
          <select value={editForm.weather} onChange={(e) => setEditForm(prev => ({ ...prev, weather: e.target.value }))} className="memory-detail-form-select">
            {weathers.map(w => <option key={w} value={w}>{weatherEmoji[w]} {w}</option>)}
          </select>
        </div>
      </div>
      <div className="memory-detail-form-group">
        <label className="memory-detail-form-label">내용</label>
        <textarea value={editForm.content} onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))} rows={4} className="memory-detail-form-textarea" />
      </div>
      <div className="memory-detail-edit-buttons">
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
          className="memory-detail-cancel-btn"
        >취소</button>
        <button onClick={handleSave} disabled={isSaving} className="memory-detail-save-btn">{isSaving ? '저장 중...' : '저장'}</button>
      </div>
    </div>
  );

  return (
    <div className="memory-detail-overlay">
      <div onClick={handleClose} className="memory-detail-backdrop" />

      <div className={`memory-detail-modal ${isDesktop ? 'memory-detail-modal--desktop' : 'memory-detail-modal--mobile'}`}>
        {loading ? (
          <div className="memory-detail-loading">
            <span className="memory-detail-loading-icon">favorite</span>
            <p className="memory-detail-loading-text">로딩 중...</p>
          </div>
        ) : detail ? (
          <>
            {(imageUrls.length > 0 || isEditMode) && renderImageSection()}
            <div className="memory-detail-content-section">
              {isEditMode ? renderEditForm() : renderContentHeader()}
            </div>
          </>
        ) : (
          <div className="memory-detail-error">
            <p className="memory-detail-error-text">불러오기 실패</p>
            <button onClick={handleClose} className="memory-detail-error-close-btn">닫기</button>
          </div>
        )}
      </div>

      <ImageViewer images={imageUrls} initialIndex={imageViewerIndex} visible={imageViewerVisible} onClose={() => setImageViewerVisible(false)} />

      <CommentModal
        visible={commentModalVisible}
        boardId={boardId!}
        comments={comments}
        currentUserName={currentUserName}
        onCommentsChange={handleCommentsChange}
        onClose={() => setCommentModalVisible(false)}
      />

      <NaverMapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onConfirm={(place, lat, lng) => {
          setEditForm(prev => ({ ...prev, place }));
          setEditLocationCoords({ latitude: lat, longitude: lng });
        }}
        initialLat={editLocationCoords.latitude ?? undefined}
        initialLng={editLocationCoords.longitude ?? undefined}
      />
    </div>
  );
}

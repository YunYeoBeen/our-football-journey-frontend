import { useState, useRef, useEffect } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import imageCompression from 'browser-image-compression';
import type { Memory } from '../../types';
import { CategoryMap, WeatherMap } from '../../types';
import { boardApi } from '../../services/boardApi';
import { s3Api } from '../../services/s3Api';
import NaverMapPickerModal from '../common/NaverMapPickerModal';
import '../../styles/AddMemoryModal.css';

const compressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
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
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    category: '데이트' as Memory['category'],
    content: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    isSingleDay: false,
    weather: '맑음' as Memory['weather']
  });

  useEffect(() => {
    if (visible && initialDate) {
      setFormData(prev => ({ ...prev, startDate: initialDate, endDate: initialDate }));
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
    if (e.dataTransfer.files.length > 0) handleFilesSelect(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) { message.warning('제목을 입력해주세요!'); titleInputRef.current?.focus(); return; }
    if (!formData.location.trim()) { message.warning('장소를 입력해주세요!'); locationInputRef.current?.focus(); return; }
    if (!formData.content.trim()) { message.warning('내용을 입력해주세요!'); contentInputRef.current?.focus(); return; }

    setIsSubmitting(true);
    try {
      const imageKeys: string[] = [];

      if (selectedFiles.length > 0) {
        const compressedFiles = await Promise.all(
          selectedFiles.map(async (file) => {
            try { return await imageCompression(file, compressionOptions); }
            catch { console.warn(`압축 실패, 원본 사용: ${file.name}`); return file; }
          })
        );

        const presignedUrls = await s3Api.getPresignedUploadUrls(selectedFiles.map(f => f.name));
        await Promise.all(presignedUrls.map(async ({ uploadUrl, key }, idx) => {
          await s3Api.uploadToS3(uploadUrl, compressedFiles[idx]);
          imageKeys.push(key);
        }));
      }

      if (!formData.isSingleDay && formData.endDate < formData.startDate) {
        message.warning('종료 날짜는 시작 날짜보다 이전일 수 없습니다!');
        return;
      }

      const boardData = {
        startDate: `${formData.startDate}T00:00:00`,
        endDate: formData.isSingleDay ? `${formData.startDate}T00:00:00` : `${formData.endDate}T00:00:00`,
        title: formData.title || 'Untitled',
        place: formData.location || 'Unknown',
        category: CategoryMap.toServer[formData.category] || 'DATE',
        content: formData.content,
        imageKeys: imageKeys,
        weather: WeatherMap.toServer[formData.weather] || 'SUNNY',
        ...(locationCoords.latitude != null && locationCoords.longitude != null && {
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
        }),
      };

      await boardApi.create(boardData);
      message.success('Memory saved!');
      if (onCreated) await onCreated();
      handleClose();
    } catch (error) {
      console.error('게시글 생성 실패:', error);
      message.error('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '', location: '', category: '데이트', content: '',
      startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD'),
      isSingleDay: false, weather: '맑음'
    });
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setLocationCoords({ latitude: null, longitude: null });
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="add-memory-overlay">
      <div onClick={handleClose} className="add-memory-backdrop" />

      <div className="add-memory-modal">
        {/* Header */}
        <div className="add-memory-header">
          <h2 className="add-memory-title">Create New Memory</h2>
          <button onClick={handleClose} className="add-memory-close-btn">
            <span className="icon" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div className="add-memory-content">
          {/* Photo Upload */}
          <div>
            {previewUrls.length > 0 && (
              <div className="add-memory-preview-grid">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="add-memory-preview-item">
                    <img src={url} alt={`Preview ${idx + 1}`} className="add-memory-preview-image" />
                    <button onClick={() => handleRemoveImage(idx)} className="add-memory-preview-remove-btn">
                      <span className="icon" style={{ fontSize: 14 }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedFiles.length < MAX_IMAGES && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`add-memory-upload-zone ${isDragging ? 'add-memory-upload-zone--dragging' : ''}`}
              >
                <div className="add-memory-upload-icon-wrapper">
                  <span className="add-memory-upload-icon">add_photo_alternate</span>
                </div>
                <p className="add-memory-upload-text">사진 추가 ({selectedFiles.length}/{MAX_IMAGES})</p>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleFilesSelect(e.target.files)} style={{ display: 'none' }} />
          </div>

          {/* Title */}
          <div className="add-memory-form-group">
            <label className="add-memory-label">제목 <span className="add-memory-required">*</span></label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="추억의 제목을 입력하세요"
              className="add-memory-input"
            />
          </div>

          {/* Date Range */}
          <div className="add-memory-form-group">
            <div className="add-memory-checkbox-row">
              <input
                type="checkbox"
                id="singleDay"
                checked={formData.isSingleDay}
                onChange={(e) => {
                  const isSingleDay = e.target.checked;
                  const today = dayjs().format('YYYY-MM-DD');
                  setFormData({ ...formData, isSingleDay, startDate: isSingleDay ? today : formData.startDate, endDate: isSingleDay ? today : formData.endDate });
                }}
                className="add-memory-checkbox"
              />
              <label htmlFor="singleDay" className="add-memory-checkbox-label">당일</label>
            </div>

            {!formData.isSingleDay && (
              <div className="add-memory-date-fields">
                <div className="add-memory-date-row">
                  <label className="add-memory-date-label">시작</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="add-memory-date-input"
                  />
                </div>
                <div className="add-memory-date-row">
                  <label className="add-memory-date-label">종료</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="add-memory-date-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Place */}
          <div className="add-memory-form-group">
            <label className="add-memory-label">장소 <span className="add-memory-required">*</span></label>
            <div className="add-memory-place-row">
              <input
                ref={locationInputRef}
                type="text"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  if (locationCoords.latitude !== null) setLocationCoords({ latitude: null, longitude: null });
                }}
                placeholder="장소를 입력하세요"
                className="add-memory-input"
                style={{ flex: 1, minWidth: 0 }}
              />
              <button type="button" onClick={() => setIsMapPickerOpen(true)} className="add-memory-map-btn">
                <span className="icon" style={{ fontSize: 16 }}>location_on</span>지도
              </button>
            </div>
          </div>

          {/* Category & Weather */}
          <div className="add-memory-row">
            <div>
              <label className="add-memory-label">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Memory['category'] })}
                className="add-memory-select"
              >
                <option value="데이트">💕 데이트</option>
                <option value="일상">📅 일상</option>
                <option value="여행">✈️ 여행</option>
                <option value="맛집">🍽️ 맛집</option>
                <option value="축구">⚽ 축구</option>
              </select>
            </div>
            <div>
              <label className="add-memory-label">Weather</label>
              <select
                value={formData.weather}
                onChange={(e) => setFormData({ ...formData, weather: e.target.value as Memory['weather'] })}
                className="add-memory-select"
              >
                <option value="맑음">☀️ Sunny</option>
                <option value="흐림">☁️ Cloudy</option>
                <option value="비">🌧️ Rainy</option>
                <option value="눈">❄️ Snowy</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="add-memory-form-group">
            <label className="add-memory-label">내용 <span className="add-memory-required">*</span></label>
            <textarea
              ref={contentInputRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="추억을 기록하세요..."
              rows={3}
              className="add-memory-textarea"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="add-memory-footer">
          <button onClick={handleClose} className="add-memory-cancel-btn">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !formData.content.trim()} className="add-memory-submit-btn">
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <NaverMapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onConfirm={(place, lat, lng) => {
          setFormData(prev => ({ ...prev, location: place }));
          setLocationCoords({ latitude: lat, longitude: lng });
        }}
        initialLat={locationCoords.latitude ?? undefined}
        initialLng={locationCoords.longitude ?? undefined}
      />
    </div>
  );
}

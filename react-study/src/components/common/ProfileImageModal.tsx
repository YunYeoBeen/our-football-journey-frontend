import { useState, useRef } from 'react';
import { message } from 'antd';
import imageCompression from 'browser-image-compression';
import { s3Api } from '../../services/s3Api';
import { userApi } from '../../services/userApi';
import '../../styles/ProfileImageModal.css';

const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 800,
  useWebWorker: true,
};

interface ProfileImageModalProps {
  visible: boolean;
  currentImageUrl?: string;
  currentNickname?: string;
  onClose: () => void;
  onUpdated: (imageKey?: string, nickname?: string) => void;
}

const ProfileImageModal: React.FC<ProfileImageModalProps> = ({
  visible,
  currentImageUrl,
  currentNickname,
  onClose,
  onUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState(currentNickname || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // currentNickname 외부 변경 시 동기화
  const [prevNickname, setPrevNickname] = useState(currentNickname);
  if (currentNickname !== prevNickname) {
    setPrevNickname(currentNickname);
    setNickname(currentNickname || '');
  }

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      message.error('이미지 파일만 업로드 가능합니다.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const nicknameChanged = nickname.trim() !== (currentNickname || '');
  const canSave = !!selectedFile || nicknameChanged;

  const handleSave = async () => {
    if (!canSave) return;

    setIsUploading(true);
    try {
      let uploadedKey: string | undefined;

      if (selectedFile) {
        let fileToUpload: File | Blob = selectedFile;
        try {
          fileToUpload = await imageCompression(selectedFile, compressionOptions);
        } catch {
          console.warn('압축 실패, 원본 사용');
        }

        const presignedUrls = await s3Api.getPresignedUploadUrls([selectedFile.name], 'PROFILE');
        if (presignedUrls.length > 0) {
          const { uploadUrl, key } = presignedUrls[0];
          await s3Api.uploadToS3(uploadUrl, fileToUpload);
          uploadedKey = key;
        }
      }

      const nicknameToSave = nicknameChanged ? nickname.trim() : undefined;
      await userApi.updateProfile(uploadedKey, nicknameToSave);

      message.success('프로필이 변경되었습니다!');
      onUpdated(uploadedKey, nicknameToSave);
      handleClose();
    } catch {
      message.error('프로필 변경에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setNickname(currentNickname || '');
    onClose();
  };

  if (!visible) return null;

  const displayImage = previewUrl || currentImageUrl;

  return (
    <div className="profile-modal-overlay">
      <div onClick={handleClose} className="profile-modal-backdrop" />

      <div className="profile-modal">
        {/* Header */}
        <div className="profile-modal-header">
          <h2 className="profile-modal-title">프로필 설정</h2>
          <button onClick={handleClose} className="profile-modal-close-btn">
            <span className="icon" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div className="profile-modal-content">
          {/* Current/Preview Image */}
          <div className="profile-modal-preview-wrapper">
            <div className="profile-modal-preview">
              {displayImage ? (
                <img src={displayImage} alt="Profile" className="profile-modal-preview-image" />
              ) : (
                <div className="profile-modal-preview-empty">
                  <span className="profile-modal-preview-icon">person</span>
                </div>
              )}
            </div>
          </div>

          {/* 닉네임 입력 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#666',
              marginBottom: 6,
            }}>
              닉네임
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'Material Symbols Outlined',
                fontSize: 18,
                color: '#9ca3af',
                pointerEvents: 'none',
              }}>
                badge
              </span>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  fontSize: 14,
                  fontWeight: 500,
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  color: '#181110',
                  backgroundColor: '#fafafa',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#ffb4a8')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <span style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 11,
                color: '#9ca3af',
                pointerEvents: 'none',
              }}>
                {nickname.length}/20
              </span>
            </div>
          </div>

          {/* 프로필 사진 업로드 */}
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#666',
            marginBottom: 6,
          }}>
            프로필 사진
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`profile-modal-upload-zone ${isDragging ? 'profile-modal-upload-zone--dragging' : ''}`}
          >
            <div className="profile-modal-upload-icon-wrapper">
              <span className="profile-modal-upload-icon">add_photo_alternate</span>
            </div>
            <p className="profile-modal-upload-title">
              {selectedFile ? selectedFile.name : '사진 선택하기'}
            </p>
            <p className="profile-modal-upload-subtitle">
              클릭하거나 드래그하여 업로드
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="profile-modal-footer">
          <button onClick={handleClose} className="profile-modal-cancel-btn">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || isUploading}
            className="profile-modal-submit-btn"
          >
            {isUploading && <span className="profile-modal-submit-spinner">progress_activity</span>}
            {isUploading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageModal;

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
  onClose: () => void;
  onUpdated: (newImageKey: string) => void;
}

const ProfileImageModal: React.FC<ProfileImageModalProps> = ({
  visible,
  currentImageUrl,
  onClose,
  onUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      let fileToUpload: File | Blob = selectedFile;
      try {
        const compressed = await imageCompression(selectedFile, compressionOptions);
        fileToUpload = compressed;
      } catch {
        console.warn('압축 실패, 원본 사용');
      }

      const presignedUrls = await s3Api.getPresignedUploadUrls([selectedFile.name], 'PROFILE');

      if (presignedUrls.length > 0) {
        const { uploadUrl, key } = presignedUrls[0];
        await s3Api.uploadToS3(uploadUrl, fileToUpload);
        await userApi.updateProfileImage(key);

        message.success('프로필 이미지가 변경되었습니다!');
        onUpdated(key);
        handleClose();
      }
    } catch {
      message.error('프로필 이미지 변경에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
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
          <h2 className="profile-modal-title">프로필 사진 변경</h2>
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

          {/* Upload Area */}
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
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="profile-modal-submit-btn"
          >
            {isUploading && <span className="profile-modal-submit-spinner">progress_activity</span>}
            {isUploading ? '업로드 중...' : '변경하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageModal;

import { useState, useRef } from 'react';
import { message } from 'antd';
import { s3Api } from '../services/s3Api';
import { userApi } from '../services/userApi';

const styles = {
  colors: {
    primary: '#ffb4a8',
    textDark: '#181110',
    textMuted: '#8d645e',
    gray50: '#f9fafb',
    gray100: '#f1f1f1',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
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
      // 1. Presigned Upload URL 발급 (PROFILE 타입)
      const presignedUrls = await s3Api.getPresignedUploadUrls([selectedFile.name], 'PROFILE');

      if (presignedUrls.length > 0) {
        const { uploadUrl, key } = presignedUrls[0];

        // 2. S3에 파일 업로드
        await s3Api.uploadToS3(uploadUrl, selectedFile);

        // 3. 서버에 프로필 이미지 변경 요청
        await userApi.updateProfileImage(key);

        message.success('프로필 이미지가 변경되었습니다!');
        onUpdated(key);
        handleClose();
      }
    } catch (error) {
      // 프로필 이미지 업로드 실패
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 360,
          backgroundColor: 'white',
          borderRadius: 16,
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
            padding: '20px 24px',
            borderBottom: `1px solid ${styles.colors.gray100}`,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: styles.colors.textDark,
              margin: 0,
            }}
          >
            프로필 사진 변경
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
            }}
          >
            <span style={{ fontSize: 24, fontFamily: 'Material Symbols Outlined' }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Current/Preview Image */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: `4px solid ${styles.colors.primary}`,
                overflow: 'hidden',
                backgroundColor: styles.colors.gray100,
              }}
            >
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 48,
                      color: styles.colors.gray400,
                      fontFamily: 'Material Symbols Outlined',
                    }}
                  >
                    person
                  </span>
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
            style={{
              border: `2px dashed ${isDragging ? styles.colors.primary : styles.colors.gray200}`,
              borderRadius: 12,
              backgroundColor: isDragging ? `${styles.colors.primary}10` : styles.colors.gray50,
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: `${styles.colors.primary}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  color: styles.colors.primary,
                  fontFamily: 'Material Symbols Outlined',
                }}
              >
                add_photo_alternate
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: styles.colors.textDark,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {selectedFile ? selectedFile.name : '사진 선택하기'}
            </p>
            <p
              style={{
                fontSize: 12,
                color: styles.colors.textMuted,
                margin: 0,
              }}
            >
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
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: styles.colors.gray50,
            borderTop: `1px solid ${styles.colors.gray100}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: styles.colors.textMuted,
              backgroundColor: 'white',
              border: `1px solid ${styles.colors.gray200}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: styles.fontFamily,
            }}
          >
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              backgroundColor: styles.colors.primary,
              border: 'none',
              borderRadius: 8,
              cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
              opacity: !selectedFile || isUploading ? 0.5 : 1,
              fontFamily: styles.fontFamily,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isUploading && (
              <span
                style={{
                  fontSize: 16,
                  fontFamily: 'Material Symbols Outlined',
                  animation: 'spin 1s linear infinite',
                }}
              >
                progress_activity
              </span>
            )}
            {isUploading ? '업로드 중...' : '변경하기'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProfileImageModal;

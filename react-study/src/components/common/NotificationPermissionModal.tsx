import { useState } from 'react';
import { getFCMToken } from '../../services/firebase';
import { userApi } from '../../services/userApi';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPermissionModal({ isOpen, onClose }: NotificationPermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleEnableNotification = async () => {
    setIsLoading(true);
    try {
      const fcmToken = await getFCMToken();
      if (fcmToken) {
        await userApi.updateFirebaseToken(fcmToken);
        localStorage.setItem('notificationRequested', 'true');
        onClose();
      } else {
        alert('알림 권한이 거부되었거나 지원되지 않는 환경입니다.');
      }
    } catch (error) {
      console.error('알림 설정 실패:', error);
      alert('알림 설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('notificationRequested', 'true');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        maxWidth: 320,
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
        <h2 style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333',
          marginBottom: 12,
        }}>
          알림을 받으시겠어요?
        </h2>
        <p style={{
          fontSize: 14,
          color: '#666',
          marginBottom: 24,
          lineHeight: 1.5,
        }}>
          새 게시글이나 댓글이 올라오면<br />
          푸시 알림으로 알려드려요!
        </p>
        <button
          onClick={handleEnableNotification}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '14px 0',
            backgroundColor: '#ff9a76',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: 12,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? '설정 중...' : '알림 받기'}
        </button>
        <button
          onClick={handleSkip}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 0',
            backgroundColor: 'transparent',
            color: '#999',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}

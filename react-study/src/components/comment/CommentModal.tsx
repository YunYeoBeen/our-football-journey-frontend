import { useEffect } from 'react';
import CommentSection from './CommentSection';
import type { CommentResponseDto } from '../../types';

const styles = {
  colors: {
    primary: '#ffb4a8',
    textDark: '#333333',
    textMuted: '#666666',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

interface CommentModalProps {
  visible: boolean;
  boardId: number;
  comments: CommentResponseDto[];
  currentUserName: string;
  onCommentsChange: () => void;
  onClose: () => void;
}

export default function CommentModal({
  visible,
  boardId,
  comments,
  currentUserName,
  onCommentsChange,
  onClose,
}: CommentModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {/* 배경 오버레이 */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* 모달 컨테이너 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 500,
          height: '85vh',
          backgroundColor: 'white',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: styles.fontFamily,
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 16px 12px',
            borderBottom: `1px solid ${styles.colors.gray100}`,
            position: 'relative',
          }}
        >
          {/* 드래그 핸들 */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 36,
              height: 4,
              backgroundColor: styles.colors.gray200,
              borderRadius: 2,
            }}
          />

          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: styles.colors.textDark,
            }}
          >
            댓글
          </h3>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: styles.colors.textMuted,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* 댓글 섹션 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CommentSection
            boardId={boardId}
            comments={comments}
            currentUserName={currentUserName}
            onCommentsChange={onCommentsChange}
          />
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

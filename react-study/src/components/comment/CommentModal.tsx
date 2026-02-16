import { useEffect } from 'react';
import CommentSection from './CommentSection';
import type { CommentResponseDto } from '../../types';
import '../../styles/CommentModal.css';

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
    <div className="comment-modal-overlay">
      <div onClick={onClose} className="comment-modal-backdrop" />

      <div className="comment-modal">
        {/* 헤더 */}
        <div className="comment-modal-header">
          <div className="comment-modal-drag-handle" />
          <h3 className="comment-modal-title">댓글</h3>
          <button onClick={onClose} className="comment-modal-close-btn">✕</button>
        </div>

        {/* 댓글 섹션 */}
        <div className="comment-modal-content">
          <CommentSection
            boardId={boardId}
            comments={comments}
            currentUserName={currentUserName}
            onCommentsChange={onCommentsChange}
          />
        </div>
      </div>
    </div>
  );
}

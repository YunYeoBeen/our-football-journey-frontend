import { useState, useRef, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { commentApi } from '../../services/commentApi';
import CommentItem from './CommentItem';
import type { CommentResponseDto } from '../../types';

const styles = {
  colors: {
    primary: '#ffb4a8',
    textDark: '#333333',
    textMuted: '#666666',
    textLight: '#999999',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

interface CommentSectionProps {
  boardId: number;
  comments: CommentResponseDto[];
  currentUserName: string;
  onCommentsChange: () => void;
}

export default function CommentSection({
  boardId,
  comments,
  currentUserName,
  onCommentsChange,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ parentId: number; userName: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 대댓글 모드 시 input focus
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  // 댓글 작성
  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await commentApi.createComment({
        boardId,
        parentId: replyTo?.parentId,
        content: newComment,
        userName: currentUserName,
      });
      message.success(replyTo ? '답글이 등록되었습니다.' : '댓글이 등록되었습니다.');
      setNewComment('');
      setReplyTo(null);
      onCommentsChange();
    } catch {
      message.error('댓글 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 답글 달기
  const handleReply = useCallback((parentId: number, parentUserName: string) => {
    setReplyTo({ parentId, userName: parentUserName });
  }, []);

  // 댓글 삭제
  const handleDelete = useCallback(async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await commentApi.deleteComment(commentId);
      message.success('댓글이 삭제되었습니다.');
      onCommentsChange();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  }, [onCommentsChange]);

  // 댓글 수정
  const handleUpdate = useCallback(() => {
    onCommentsChange();
  }, [onCommentsChange]);

  // Enter 키 핸들링
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: styles.fontFamily,
      }}
    >
      {/* 댓글 목록 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px',
        }}
      >
        {comments.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: styles.colors.textLight,
              fontSize: 14,
            }}
          >
            아직 댓글이 없습니다.
            <br />
            첫 번째 댓글을 남겨보세요!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.commentId}
              comment={comment}
              boardId={boardId}
              currentUserName={currentUserName}
              onReply={handleReply}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>

      {/* 댓글 입력 영역 */}
      <div
        style={{
          borderTop: `1px solid ${styles.colors.gray200}`,
          padding: 12,
          backgroundColor: 'white',
        }}
      >
        {/* 답글 대상 표시 */}
        {replyTo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              padding: '6px 10px',
              backgroundColor: styles.colors.gray50,
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <span style={{ color: styles.colors.textMuted }}>
              <strong style={{ color: styles.colors.textDark }}>@{replyTo.userName}</strong>
              에게 답글 작성 중
            </span>
            <button
              onClick={() => setReplyTo(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 14,
                color: styles.colors.textMuted,
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 입력 폼 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: `1px solid ${styles.colors.gray200}`,
              borderRadius: 20,
              fontSize: 14,
              outline: 'none',
              fontFamily: styles.fontFamily,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            style={{
              padding: '10px 16px',
              backgroundColor: newComment.trim() ? styles.colors.primary : styles.colors.gray200,
              color: newComment.trim() ? 'white' : styles.colors.textMuted,
              border: 'none',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 600,
              cursor: newComment.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {isSubmitting ? '...' : '게시'}
          </button>
        </div>
      </div>
    </div>
  );
}

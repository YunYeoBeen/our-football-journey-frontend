import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { commentApi } from '../../services/commentApi';
import { s3Api } from '../../services/s3Api';
import type { CommentResponseDto } from '../../types';

const styles = {
  colors: {
    primary: '#ffb4a8',
    textDark: '#333333',
    textMuted: '#666666',
    textLight: '#999999',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    danger: '#ef4444',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

interface CommentItemProps {
  comment: CommentResponseDto;
  boardId: number;
  currentUserName: string;
  isChild?: boolean;
  onReply?: (parentId: number, parentUserName: string) => void;
  onDelete: (commentId: number) => void;
  onUpdate: (commentId: number, newContent: string) => void;
  refreshChildrenFor?: number | null;
  onChildrenRefreshed?: () => void;
}

export default function CommentItem({
  comment,
  boardId,
  currentUserName,
  isChild = false,
  onReply,
  onDelete,
  onUpdate,
  refreshChildrenFor,
  onChildrenRefreshed,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);
  const [childComments, setChildComments] = useState<CommentResponseDto[]>([]);
  const [childPage, setChildPage] = useState(0);
  const [hasMoreChildren, setHasMoreChildren] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const isOwner = comment.userName === currentUserName;

  // 프로필 이미지 로드
  useEffect(() => {
    const loadProfileImage = async () => {
      if (comment.profileUrl) {
        try {
          const url = await s3Api.getPresignedViewUrl(comment.profileUrl, 'PROFILE');
          setProfileImageUrl(url);
        } catch {
          // 프로필 이미지 로드 실패 시 무시
        }
      }
    };
    loadProfileImage();
  }, [comment.profileUrl]);

  // 대댓글 새로고침 트리거
  useEffect(() => {
    if (refreshChildrenFor === comment.commentId && !isChild) {
      // 대댓글이 이미 열려있으면 새로고침, 아니면 열기
      if (showReplies) {
        loadChildComments(true);
      } else {
        setShowReplies(true);
        loadChildComments(true);
      }
      onChildrenRefreshed?.();
    }
  }, [refreshChildrenFor]);

  // 대댓글 로드
  const loadChildComments = useCallback(async (reset = false) => {
    if (loadingChildren) return;
    setLoadingChildren(true);
    try {
      const page = reset ? 0 : childPage;
      const response = await commentApi.getChildComments(comment.commentId, page, 5);
      if (reset) {
        setChildComments(response.content);
        setChildPage(1);
      } else {
        setChildComments(prev => [...prev, ...response.content]);
        setChildPage(page + 1);
      }
      setHasMoreChildren(!response.last);
    } catch {
      message.error('답글을 불러오지 못했습니다.');
    } finally {
      setLoadingChildren(false);
    }
  }, [comment.commentId, childPage, loadingChildren]);

  // 답글 보기 토글
  const handleToggleReplies = () => {
    if (!showReplies && childComments.length === 0) {
      loadChildComments(true);
    }
    setShowReplies(!showReplies);
  };

  // 수정 저장
  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await commentApi.updateComment(comment.commentId, { content: editContent });
      onUpdate(comment.commentId, editContent);
      setIsEditing(false);
      message.success('댓글이 수정되었습니다.');
    } catch {
      message.error('수정에 실패했습니다.');
    }
  };

  // 날짜 포맷팅 (서버에서 UTC로 오는 시간을 로컬로 변환)
  const formatDate = (dateStr: string) => {
    // 서버에서 UTC 시간이 Z 없이 오는 경우 Z를 추가
    const isoString = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div
      style={{
        paddingLeft: isChild ? 24 : 0,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottom: isChild ? 'none' : `1px solid ${styles.colors.gray100}`,
      }}
    >
      {/* 헤더: 프로필 + 유저명 + 시간 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {/* 프로필 이미지 */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: styles.colors.gray100,
            backgroundImage: profileImageUrl ? `url(${profileImageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${styles.colors.gray200}`,
          }}
        >
          {!profileImageUrl && (
            <span
              className="icon"
              style={{ fontSize: 16, color: styles.colors.textLight }}
            >
              person
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: styles.colors.textDark }}>
            {comment.userName}
          </span>
          <span style={{ fontSize: 11, color: styles.colors.textLight }}>
            {formatDate(comment.createdAt)}
          </span>
        </div>
      </div>

      {/* 내용 또는 수정 폼 */}
      {isEditing ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              border: `1px solid ${styles.colors.gray200}`,
              borderRadius: 6,
              fontSize: 13,
              resize: 'none',
              minHeight: 50,
              fontFamily: styles.fontFamily,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              style={{
                padding: '5px 10px',
                backgroundColor: styles.colors.gray100,
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: '5px 10px',
                backgroundColor: styles.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: styles.colors.textDark, margin: 0, lineHeight: 1.5 }}>
          {comment.content}
        </p>
      )}

      {/* 액션 버튼들 */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          {/* 답글 달기 (부모 댓글만) */}
          {!isChild && onReply && (
            <button
              onClick={() => onReply(comment.commentId, comment.userName)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: styles.colors.textMuted,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              답글 달기
            </button>
          )}

          {/* 수정/삭제 (본인만) */}
          {isOwner && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: styles.colors.textMuted,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                수정
              </button>
              <button
                onClick={() => onDelete(comment.commentId)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: styles.colors.danger,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                삭제
              </button>
            </>
          )}
        </div>
      )}

      {/* 대댓글 토글 (부모 댓글이고 대댓글이 있을 때) */}
      {!isChild && (comment.childCount ?? 0) > 0 && (
        <button
          onClick={handleToggleReplies}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 12,
            color: styles.colors.textMuted,
            cursor: 'pointer',
            padding: 0,
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: showReplies ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              fontSize: 10,
            }}
          >
            ▶
          </span>
          {showReplies ? '답글 숨기기' : `답글 ${comment.childCount}개 보기`}
        </button>
      )}

      {/* 대댓글 목록 */}
      {showReplies && (
        <div style={{ marginTop: 8, marginLeft: 8, borderLeft: `2px solid ${styles.colors.gray100}` }}>
          {childComments.map((child) => (
            <CommentItem
              key={child.commentId}
              comment={child}
              boardId={boardId}
              currentUserName={currentUserName}
              isChild={true}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
          {hasMoreChildren && (
            <button
              onClick={() => loadChildComments()}
              disabled={loadingChildren}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: styles.colors.primary,
                cursor: loadingChildren ? 'wait' : 'pointer',
                padding: '8px 24px',
              }}
            >
              {loadingChildren ? '로딩 중...' : '더 보기'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

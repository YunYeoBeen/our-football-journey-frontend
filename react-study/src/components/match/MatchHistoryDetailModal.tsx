import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { matchHistoryApi } from '../../services/matchHistoryApi';
import type { MatchHistoryResponseDto, PlaceType } from '../../services/matchHistoryApi';
import { useAuthStore } from '../../store/userAuthStore';

dayjs.locale('ko');

interface MatchHistoryDetailModalProps {
  visible: boolean;
  history: MatchHistoryResponseDto | null;
  onClose: () => void;
  onEdit: (history: MatchHistoryResponseDto) => void;
  onDeleted: () => void;
}

const modalStyles = {
  colors: {
    primary: '#ffb4a8',
    primaryDark: '#ff8a75',
    ulsanBlue: '#004A9F',
    textDark: '#333333',
    textMuted: '#666666',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray500: '#6b7280',
    white: '#ffffff',
    win: '#22c55e',
    lose: '#ef4444',
    draw: '#6b7280',
    restaurant: '#ef4444',
    cafe: '#f97316',
    bar: '#8b5cf6',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

const placeTypeOptions: { value: PlaceType; label: string; icon: string; color: string }[] = [
  { value: 'STADIUM', label: '경기장', icon: 'sports_soccer', color: modalStyles.colors.ulsanBlue },
  { value: 'RESTAURANT', label: '맛집', icon: 'restaurant', color: modalStyles.colors.restaurant },
  { value: 'CAFE', label: '카페', icon: 'local_cafe', color: modalStyles.colors.cafe },
  { value: 'BAR', label: '술집', icon: 'sports_bar', color: modalStyles.colors.bar },
  { value: 'ETC', label: '기타', icon: 'place', color: modalStyles.colors.primary },
];

const MatchHistoryDetailModal: React.FC<MatchHistoryDetailModalProps> = ({
  visible,
  history,
  onClose,
  onEdit,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const userName = useAuthStore((s) => s.user?.name);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [visible, onClose, showDeleteConfirm]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!visible) {
      setShowDeleteConfirm(false);
    }
  }, [visible]);

  const handleDelete = async () => {
    if (!history) return;

    setIsDeleting(true);
    try {
      await matchHistoryApi.delete(history.id);
      onDeleted();
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 경기 결과 판정
  const getMatchResult = () => {
    if (!history?.matchInfo || history.homeScore === undefined || history.awayScore === undefined) {
      return null;
    }
    if (history.homeScore > history.awayScore) return 'win';
    if (history.homeScore < history.awayScore) return 'lose';
    return 'draw';
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'win': return modalStyles.colors.win;
      case 'lose': return modalStyles.colors.lose;
      case 'draw': return modalStyles.colors.draw;
      default: return modalStyles.colors.textMuted;
    }
  };

  const getResultLabel = (result: string | null) => {
    switch (result) {
      case 'win': return '승리';
      case 'lose': return '패배';
      case 'draw': return '무승부';
      default: return '';
    }
  };

  if (!visible || !history) return null;

  const result = getMatchResult();
  const resultColor = getResultColor(result);
  const matchDate = history.matchInfo?.kickOffTime || history.createdAt;
  const isOwner = userName === history.writer;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          fontFamily: modalStyles.fontFamily,
        }}
      >
        {/* 배경 오버레이 */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
        />

        {/* 모달 바텀 시트 */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 500,
            maxHeight: '90vh',
            backgroundColor: modalStyles.colors.white,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* 드래그 핸들 */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: modalStyles.colors.gray200,
              }}
            />
          </div>

          {/* 헤더 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px 12px',
              borderBottom: `1px solid ${modalStyles.colors.gray100}`,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: modalStyles.colors.textDark,
              }}
            >
              직관 기록
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                color: modalStyles.colors.gray500,
                cursor: 'pointer',
                padding: 4,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* 콘텐츠 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* 경기 정보 카드 */}
            <div
              style={{
                padding: 16,
                backgroundColor: modalStyles.colors.gray100,
                borderRadius: 12,
                borderLeft: `4px solid ${modalStyles.colors.ulsanBlue}`,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: modalStyles.colors.textMuted,
                  marginBottom: 8,
                }}
              >
                {dayjs(matchDate).format('YYYY년 M월 D일 (ddd) HH:mm')}
              </div>

              {history.matchInfo ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: modalStyles.colors.ulsanBlue,
                          marginBottom: 4,
                        }}
                      >
                        {history.matchInfo.homeTeam}
                      </div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: modalStyles.colors.textDark,
                        }}
                      >
                        {history.homeScore ?? '-'}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: modalStyles.colors.gray500,
                      }}
                    >
                      :
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: modalStyles.colors.textMuted,
                          marginBottom: 4,
                        }}
                      >
                        {history.matchInfo.awayTeam}
                      </div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: modalStyles.colors.textDark,
                        }}
                      >
                        {history.awayScore ?? '-'}
                      </div>
                    </div>
                  </div>

                  {result && (
                    <div style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 16,
                          fontSize: 13,
                          fontWeight: 600,
                          backgroundColor: `${resultColor}15`,
                          color: resultColor,
                        }}
                      >
                        {getResultLabel(result)}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      color: modalStyles.colors.textMuted,
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14, verticalAlign: 'middle' }}>
                      stadium
                    </span>{' '}
                    {history.matchInfo.stadium}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: modalStyles.colors.textMuted }}>
                  경기 정보 없음
                </div>
              )}
            </div>

            {/* 방문 장소 */}
            {history.places && history.places.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: modalStyles.colors.textMuted,
                    marginBottom: 8,
                  }}
                >
                  방문 장소
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.places.map((place) => {
                    const typeOption = placeTypeOptions.find((o) => o.value === place.placeType);
                    return (
                      <div
                        key={place.id}
                        style={{
                          padding: 12,
                          backgroundColor: modalStyles.colors.gray100,
                          borderRadius: 10,
                          borderLeft: `3px solid ${typeOption?.color || modalStyles.colors.primary}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'Material Symbols Outlined',
                            fontSize: 20,
                            color: typeOption?.color,
                          }}
                        >
                          {typeOption?.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: typeOption?.color,
                              marginBottom: 2,
                            }}
                          >
                            {typeOption?.label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: modalStyles.colors.textDark,
                            }}
                          >
                            {place.address || '주소 없음'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 메모 */}
            {history.memo && (
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: modalStyles.colors.textMuted,
                    marginBottom: 8,
                  }}
                >
                  메모
                </div>
                <div
                  style={{
                    padding: 12,
                    backgroundColor: modalStyles.colors.gray100,
                    borderRadius: 10,
                    fontSize: 14,
                    color: modalStyles.colors.textDark,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {history.memo}
                </div>
              </div>
            )}

            {/* 작성자 */}
            <div
              style={{
                fontSize: 12,
                color: modalStyles.colors.textMuted,
                textAlign: 'right',
              }}
            >
              작성자: {history.writer}
            </div>
          </div>

          {/* 하단 버튼 */}
          {isOwner && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: `1px solid ${modalStyles.colors.gray100}`,
                backgroundColor: modalStyles.colors.white,
                display: 'flex',
                gap: 12,
              }}
            >
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  backgroundColor: modalStyles.colors.white,
                  color: modalStyles.colors.lose,
                  border: `1px solid ${modalStyles.colors.lose}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: modalStyles.fontFamily,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18 }}>delete</span>
                삭제
              </button>
              <button
                onClick={() => onEdit(history)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  backgroundColor: modalStyles.colors.ulsanBlue,
                  color: modalStyles.colors.white,
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: modalStyles.fontFamily,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18 }}>edit</span>
                수정
              </button>
            </div>
          )}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: modalStyles.fontFamily,
          }}
        >
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 320,
              padding: 24,
              backgroundColor: modalStyles.colors.white,
              borderRadius: 16,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: `${modalStyles.colors.lose}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Material Symbols Outlined',
                  fontSize: 24,
                  color: modalStyles.colors.lose,
                }}
              >
                delete
              </span>
            </div>
            <h4
              style={{
                margin: '0 0 8px',
                fontSize: 18,
                fontWeight: 700,
                color: modalStyles.colors.textDark,
              }}
            >
              기록을 삭제할까요?
            </h4>
            <p
              style={{
                margin: '0 0 20px',
                fontSize: 14,
                color: modalStyles.colors.textMuted,
              }}
            >
              삭제된 기록은 복구할 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  backgroundColor: modalStyles.colors.gray100,
                  color: modalStyles.colors.textDark,
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: modalStyles.fontFamily,
                }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  backgroundColor: modalStyles.colors.lose,
                  color: modalStyles.colors.white,
                  border: 'none',
                  borderRadius: 10,
                  cursor: isDeleting ? 'default' : 'pointer',
                  fontFamily: modalStyles.fontFamily,
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default MatchHistoryDetailModal;

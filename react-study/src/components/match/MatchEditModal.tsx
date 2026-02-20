import { useState, useEffect, useCallback } from 'react';
import NaverMapPickerModal from '../common/NaverMapPickerModal';
import { matchHistoryApi } from '../../services/matchHistoryApi';
import type { PlaceCreateDto, PlaceType, MatchHistoryResponseDto, MatchAttendanceStatus } from '../../services/matchHistoryApi';

interface MatchEditModalProps {
  visible: boolean;
  history: MatchHistoryResponseDto | null;
  onClose: () => void;
  onUpdated: () => void;
}

interface TempPlace {
  tempId: number;
  placeId: number; // 기존 장소는 실제 ID, 새 장소는 0
  address: string;
  latitude: number;
  longitude: number;
  placeType: PlaceType;
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

const MatchEditModal: React.FC<MatchEditModalProps> = ({
  visible,
  history,
  onClose,
  onUpdated,
}) => {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<MatchAttendanceStatus>('ATTENDING');
  const [memo, setMemo] = useState('');
  const [places, setPlaces] = useState<TempPlace[]>([]);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [editingPlaceIndex, setEditingPlaceIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextTempId, setNextTempId] = useState(1);

  // 기존 데이터 로드
  useEffect(() => {
    if (visible && history) {
      setHomeScore(history.homeScore?.toString() || '');
      setAwayScore(history.awayScore?.toString() || '');
      setAttendanceStatus(history.attendanceStatus || 'ATTENDING');
      setMemo(history.memo || '');

      // 기존 장소 로드
      if (history.places && history.places.length > 0) {
        const existingPlaces: TempPlace[] = history.places.map((p, idx) => ({
          tempId: idx + 1,
          placeId: p.id,
          address: p.address || '',
          latitude: p.latitude,
          longitude: p.longitude,
          placeType: p.placeType,
        }));
        setPlaces(existingPlaces);
        setNextTempId(existingPlaces.length + 1);
      } else {
        setPlaces([]);
        setNextTempId(1);
      }
    }
  }, [visible, history]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!visible) {
      setHomeScore('');
      setAwayScore('');
      setAttendanceStatus('ATTENDING');
      setMemo('');
      setPlaces([]);
      setNextTempId(1);
    }
  }, [visible]);

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

  const handleAddPlace = () => {
    setEditingPlaceIndex(null);
    setIsMapPickerOpen(true);
  };

  const handleEditPlace = (index: number) => {
    setEditingPlaceIndex(index);
    setIsMapPickerOpen(true);
  };

  const handleRemovePlace = (index: number) => {
    setPlaces(prev => prev.filter((_, i) => i !== index));
  };

  const handleMapConfirm = useCallback((address: string, lat: number, lng: number) => {
    if (editingPlaceIndex !== null) {
      // 수정
      setPlaces(prev => prev.map((p, i) =>
        i === editingPlaceIndex ? { ...p, address, latitude: lat, longitude: lng } : p
      ));
    } else {
      // 새로 추가
      setPlaces(prev => [
        ...prev,
        {
          tempId: nextTempId,
          placeId: 0, // 새 장소
          address,
          latitude: lat,
          longitude: lng,
          placeType: 'STADIUM',
        },
      ]);
      setNextTempId(prev => prev + 1);
    }
    setIsMapPickerOpen(false);
    setEditingPlaceIndex(null);
  }, [editingPlaceIndex, nextTempId]);

  const handlePlaceTypeChange = (index: number, placeType: PlaceType) => {
    setPlaces(prev => prev.map((p, i) =>
      i === index ? { ...p, placeType } : p
    ));
  };

  const handleSubmit = async () => {
    if (!history) return;

    // 유효성 검사
    if (!homeScore || !awayScore) {
      alert('스코어를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const placeDtos: PlaceCreateDto[] = places.map(p => ({
        placeId: p.placeId, // 기존 장소는 ID 유지, 새 장소는 0
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        placeType: p.placeType,
      }));

      await matchHistoryApi.update({
        id: history.id,
        matchId: history.matchId,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        attendanceStatus,
        memo: memo || undefined,
        places: placeDtos,
      });

      onUpdated();
    } catch {
      alert('수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible || !history) return null;

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
              직관 기록 수정
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
            {/* 경기 정보 (읽기 전용) */}
            {history.matchInfo && (
              <div
                style={{
                  padding: 12,
                  backgroundColor: modalStyles.colors.gray100,
                  borderRadius: 10,
                  borderLeft: `4px solid ${modalStyles.colors.ulsanBlue}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: modalStyles.colors.textDark }}>
                  {history.matchInfo.homeTeam} vs {history.matchInfo.awayTeam}
                </div>
                <div style={{ fontSize: 12, color: modalStyles.colors.textMuted, marginTop: 4 }}>
                  {history.matchInfo.stadium}
                </div>
              </div>
            )}

            {/* 스코어 */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: modalStyles.colors.textMuted,
                  marginBottom: 6,
                }}
              >
                스코어
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: modalStyles.colors.ulsanBlue,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {history.matchInfo?.homeTeam || '홈'}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="-"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 20,
                      fontWeight: 700,
                      textAlign: 'center',
                      border: `2px solid ${modalStyles.colors.ulsanBlue}30`,
                      borderRadius: 10,
                      outline: 'none',
                      fontFamily: modalStyles.fontFamily,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: modalStyles.colors.gray500,
                  }}
                >
                  :
                </span>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: modalStyles.colors.textMuted,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {history.matchInfo?.awayTeam || '원정'}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="-"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 20,
                      fontWeight: 700,
                      textAlign: 'center',
                      border: `1px solid ${modalStyles.colors.gray200}`,
                      borderRadius: 10,
                      outline: 'none',
                      fontFamily: modalStyles.fontFamily,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 참석 상태 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: modalStyles.colors.textMuted, marginBottom: 8 }}>
                관람 방식
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { value: 'ATTENDING', label: '직관', icon: 'stadium', color: '#22c55e' },
                  { value: 'TV', label: 'TV', icon: 'tv', color: '#8b5cf6' },
                  { value: 'NOT_ATTENDING', label: '불참', icon: 'cancel', color: '#ef4444' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAttendanceStatus(opt.value)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '10px 4px',
                      border: `2px solid ${attendanceStatus === opt.value ? opt.color : modalStyles.colors.gray200}`,
                      borderRadius: 10,
                      backgroundColor: attendanceStatus === opt.value ? `${opt.color}15` : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 22, color: attendanceStatus === opt.value ? opt.color : modalStyles.colors.gray500 }}>
                      {opt.icon}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: attendanceStatus === opt.value ? opt.color : modalStyles.colors.gray500 }}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 장소 목록 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: modalStyles.colors.textMuted,
                  }}
                >
                  방문 장소
                </label>
                <button
                  onClick={handleAddPlace}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: modalStyles.colors.primary,
                    backgroundColor: `${modalStyles.colors.primary}15`,
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>add</span>
                  장소 추가
                </button>
              </div>

              {places.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    backgroundColor: modalStyles.colors.gray100,
                    borderRadius: 12,
                    color: modalStyles.colors.textMuted,
                  }}
                >
                  <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 32, display: 'block', marginBottom: 8 }}>
                    add_location_alt
                  </span>
                  방문한 장소를 추가해보세요
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {places.map((place, index) => {
                    const typeOption = placeTypeOptions.find(o => o.value === place.placeType);
                    return (
                      <div
                        key={place.tempId}
                        style={{
                          padding: 12,
                          backgroundColor: modalStyles.colors.gray100,
                          borderRadius: 12,
                          borderLeft: `4px solid ${typeOption?.color || modalStyles.colors.primary}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontFamily: 'Material Symbols Outlined',
                                fontSize: 20,
                                color: typeOption?.color,
                              }}
                            >
                              {typeOption?.icon}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: modalStyles.colors.textDark }}>
                              {place.address || '주소 없음'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleEditPlace(index)}
                              style={{
                                padding: 4,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18, color: modalStyles.colors.gray500 }}>
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => handleRemovePlace(index)}
                              style={{
                                padding: 4,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18, color: modalStyles.colors.lose }}>
                                delete
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* 장소 유형 선택 */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {placeTypeOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => handlePlaceTypeChange(index, option.value)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                fontSize: 12,
                                fontWeight: 500,
                                color: place.placeType === option.value ? modalStyles.colors.white : option.color,
                                backgroundColor: place.placeType === option.value ? option.color : `${option.color}15`,
                                border: 'none',
                                borderRadius: 16,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>
                                {option.icon}
                              </span>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 메모 */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: modalStyles.colors.textMuted,
                  marginBottom: 6,
                }}
              >
                메모 (선택)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="이 날의 경험을 기록해보세요"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 15,
                  border: `1px solid ${modalStyles.colors.gray200}`,
                  borderRadius: 10,
                  outline: 'none',
                  fontFamily: modalStyles.fontFamily,
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: `1px solid ${modalStyles.colors.gray100}`,
              backgroundColor: modalStyles.colors.white,
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px 0',
                fontSize: 16,
                fontWeight: 700,
                backgroundColor: isSubmitting
                  ? modalStyles.colors.gray200
                  : modalStyles.colors.ulsanBlue,
                color: isSubmitting ? modalStyles.colors.gray500 : modalStyles.colors.white,
                border: 'none',
                borderRadius: 12,
                cursor: isSubmitting ? 'default' : 'pointer',
                fontFamily: modalStyles.fontFamily,
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    style={{
                      fontFamily: 'Material Symbols Outlined',
                      fontSize: 20,
                      animation: 'spin 1s linear infinite',
                    }}
                  >
                    progress_activity
                  </span>
                  수정 중...
                </>
              ) : (
                <>
                  <span
                    style={{
                      fontFamily: 'Material Symbols Outlined',
                      fontSize: 20,
                    }}
                  >
                    save
                  </span>
                  수정 완료
                </>
              )}
            </button>
            <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
          </div>
        </div>
      </div>

      {/* 지도 선택 모달 */}
      <NaverMapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => {
          setIsMapPickerOpen(false);
          setEditingPlaceIndex(null);
        }}
        onConfirm={handleMapConfirm}
        initialLat={editingPlaceIndex !== null ? places[editingPlaceIndex]?.latitude : undefined}
        initialLng={editingPlaceIndex !== null ? places[editingPlaceIndex]?.longitude : undefined}
      />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default MatchEditModal;

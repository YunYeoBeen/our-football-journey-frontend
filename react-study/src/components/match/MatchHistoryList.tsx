import { useRef, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { MatchHistoryResponseDto, PlaceType } from '../../services/matchHistoryApi';

dayjs.locale('ko');

interface MatchHistoryListProps {
  histories: MatchHistoryResponseDto[];
  selectedHistory: MatchHistoryResponseDto | null;
  onItemClick: (history: MatchHistoryResponseDto) => void;
  loading?: boolean;
}

const colors = {
  primary: '#ffb4a8',
  ulsanBlue: '#004A9F',
  win: '#22c55e',
  lose: '#ef4444',
  draw: '#6b7280',
  textDark: '#181110',
  textMuted: '#666666',
};

// PlaceType별 색상
const placeTypeColors: Record<PlaceType, string> = {
  STADIUM: '#004A9F',
  RESTAURANT: '#ef4444',
  CAFE: '#f97316',
  BAR: '#8b5cf6',
  ETC: '#ffb4a8',
};

// PlaceType별 아이콘
const placeTypeIcons: Record<PlaceType, string> = {
  STADIUM: 'sports_soccer',
  RESTAURANT: 'restaurant',
  CAFE: 'local_cafe',
  BAR: 'sports_bar',
  ETC: 'place',
};

const placeTypeLabels: Record<PlaceType, string> = {
  STADIUM: '경기장',
  RESTAURANT: '맛집',
  CAFE: '카페',
  BAR: '술집',
  ETC: '기타',
};

const MatchHistoryList: React.FC<MatchHistoryListProps> = ({
  histories,
  selectedHistory,
  onItemClick,
  loading,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 선택된 아이템으로 스크롤
  useEffect(() => {
    if (selectedHistory && listRef.current) {
      const selectedEl = itemRefs.current.get(selectedHistory.id);
      if (selectedEl) {
        selectedEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedHistory]);

  // 경기 결과 판정
  const getMatchResult = (history: MatchHistoryResponseDto) => {
    if (!history.matchInfo || history.homeScore === undefined || history.awayScore === undefined) {
      return null;
    }
    if (history.homeScore > history.awayScore) return 'win';
    if (history.homeScore < history.awayScore) return 'lose';
    return 'draw';
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'win': return colors.win;
      case 'lose': return colors.lose;
      case 'draw': return colors.draw;
      default: return colors.textMuted;
    }
  };

  const getResultLabel = (result: string | null) => {
    switch (result) {
      case 'win': return '승';
      case 'lose': return '패';
      case 'draw': return '무';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="match-history-loading">
        <span className="match-history-loading-icon">progress_activity</span>
        <span>히스토리를 불러오는 중...</span>
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div className="match-history-empty">
        <span className="match-history-empty-icon">sports_soccer</span>
        <p>아직 등록된 기록이 없습니다</p>
        <p className="match-history-empty-sub">+ 버튼을 눌러 첫 기록을 등록해보세요</p>
      </div>
    );
  }

  return (
    <div className="match-history" ref={listRef}>
      <div className="match-history-header">
        <span className="match-history-header-icon">history</span>
        <h3 className="match-history-title">직관 히스토리</h3>
        <span className="match-history-count">{histories.length}개</span>
      </div>

      <div className="match-history-list">
        {histories.map(history => {
          const result = getMatchResult(history);
          const isSelected = selectedHistory?.id === history.id;
          const resultColor = getResultColor(result);
          const matchDate = history.matchInfo?.kickOffTime || history.createdAt;
          const hasMatch = !!history.matchInfo;

          return (
            <div
              key={history.id}
              ref={el => { if (el) itemRefs.current.set(history.id, el); }}
              onClick={() => onItemClick(history)}
              className={`match-history-item ${isSelected ? 'match-history-item--selected' : ''}`}
              style={{
                borderLeftColor: hasMatch ? colors.ulsanBlue : colors.primary,
              }}
            >
              {/* 왼쪽: 날짜 */}
              <div className="match-history-date">
                <span className="match-history-date-day">
                  {dayjs(matchDate).format('DD')}
                </span>
                <span className="match-history-date-month">
                  {dayjs(matchDate).format('M월')}
                </span>
                <span className="match-history-date-year">
                  {dayjs(matchDate).format('YYYY')}
                </span>
              </div>

              {/* 중앙: 정보 */}
              <div className="match-history-content">
                <div className="match-history-top">
                  {hasMatch ? (
                    <span className="match-history-opponent">
                      vs {history.matchInfo?.awayTeam}
                    </span>
                  ) : (
                    <span className="match-history-label" style={{ color: colors.primary }}>
                      직관 기록
                    </span>
                  )}
                </div>

                {/* 장소 목록 */}
                {history.places && history.places.length > 0 && (
                  <div className="match-history-places">
                    {history.places.map(place => (
                      <div key={place.id} className="match-history-place">
                        <span
                          className="match-history-place-icon"
                          style={{ color: placeTypeColors[place.placeType] }}
                        >
                          {placeTypeIcons[place.placeType]}
                        </span>
                        <span className="match-history-place-label">
                          {placeTypeLabels[place.placeType]}
                        </span>
                        {place.address && (
                          <span className="match-history-place-address">
                            {place.address}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {history.memo && (
                  <div className="match-history-memo">
                    <span className="match-history-memo-icon">edit_note</span>
                    <span>{history.memo}</span>
                  </div>
                )}
              </div>

              {/* 오른쪽: 스코어/결과 */}
              <div className="match-history-result">
                {hasMatch && history.homeScore !== undefined && history.awayScore !== undefined ? (
                  <>
                    <div className="match-history-score">
                      <span className="match-history-score-home">{history.homeScore}</span>
                      <span className="match-history-score-separator">:</span>
                      <span className="match-history-score-away">{history.awayScore}</span>
                    </div>
                    <span
                      className="match-history-result-badge"
                      style={{
                        backgroundColor: `${resultColor}15`,
                        color: resultColor,
                      }}
                    >
                      {getResultLabel(result)}
                    </span>
                  </>
                ) : (
                  <span className="match-history-icon">
                    {hasMatch ? (
                      <span style={{ color: colors.ulsanBlue }}>sports_soccer</span>
                    ) : (
                      <span style={{ color: colors.primary }}>favorite</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .match-history-places {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .match-history-place {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: #f5f5f5;
          border-radius: 12px;
          font-size: 11px;
        }
        .match-history-place-icon {
          font-family: 'Material Symbols Outlined';
          font-size: 14px;
        }
        .match-history-place-label {
          font-weight: 500;
          color: #333;
        }
        .match-history-place-address {
          color: #888;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default MatchHistoryList;

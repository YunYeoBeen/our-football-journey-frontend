import { useRef, useEffect, useState, useCallback } from 'react';
import { boardApi, type BoardListItem, type BoardSearchParams } from '../services/boardApi';
import { s3Api } from '../services/s3Api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';

dayjs.extend(relativeTime);
dayjs.locale('ko');

const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

// 사귀기 시작한 날짜
const TOGETHER_SINCE = dayjs('2026-01-03');

const styles = {
  colors: {
    primary: '#ffb4a8',
    textDark: '#181110',
    textMuted: '#8d645e',
    gray50: '#f9fafb',
    gray100: '#f1f1f1',
    gray400: '#9ca3af',
  },
};

// 카테고리 목록
const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'DATE', label: '데이트' },
  { value: 'TRAVEL', label: '여행' },
  { value: 'FOOD', label: '맛집' },
  { value: 'FOOTBALL', label: '축구' },
];

// 날짜 포맷팅 함수
const formatDate = (dateStr: string): string => {
  const date = dayjs(dateStr);
  const now = dayjs();
  const diffDays = now.diff(date, 'day');

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.fromNow();
  return date.format('MMM D, YYYY');
};

const formatDateRange = (startDateStr: string, endDateStr?: string): string => {
  const startDate = dayjs(startDateStr);
  const endDate = endDateStr ? dayjs(endDateStr) : null;

  // 단일 날짜 또는 endDate가 없는 경우
  if (!endDate || startDate.isSame(endDate, 'day')) {
    return formatDate(startDateStr);
  }

  // 같은 달: "Jan 15-17, 2026"
  if (startDate.isSame(endDate, 'month')) {
    return `${startDate.format('MMM D')}-${endDate.format('D, YYYY')}`;
  }

  // 다른 달: "Jan 30 - Feb 2, 2026"
  if (startDate.isSame(endDate, 'year')) {
    return `${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}`;
  }

  // 다른 년도: "Dec 30, 2025 - Jan 2, 2026"
  return `${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`;
};

interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

interface TimelineContentProps {
  items: BoardItemWithUrl[];
  loading: boolean;
  loadingMore: boolean;
  hasNext: boolean;
  onItemClick: (boardId: number) => void;
  onLoadMore: () => void;
  profileImageUrl?: string;
}

// D-Day 계산
const calculateDaysTogether = (): number => {
  // 1. 오늘 날짜와 사귄 날짜의 시간을 00:00:00으로 초기화 (시간 차이 오차 제거)
  const today = dayjs().startOf('day');
  const startDate = dayjs(TOGETHER_SINCE).startOf('day');

  // 2. 날짜 차이 구하고 + 1 (시작일 포함)
  return today.diff(startDate, 'day') + 1;
};

const TimelineContent: React.FC<TimelineContentProps> = ({
  items,
  loading,
  loadingMore,
  hasNext,
  onItemClick,
  onLoadMore,
  profileImageUrl,
}) => {
  console.log('[TimelineContent] items.length:', items.length, 'loading:', loading);
  const daysTogether = calculateDaysTogether();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 검색 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<BoardItemWithUrl[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHasNext, setSearchHasNext] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // 검색 실행
  const executeSearch = useCallback(async (page = 0, append = false) => {
    const hasSearchCriteria = searchKeyword.trim() || selectedCategory || startDate || endDate;
    if (!hasSearchCriteria) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setIsSearchMode(true);

    try {
      const params: BoardSearchParams = {
        keyword: searchKeyword.trim() || undefined,
        category: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        size: 12,
      };

      const response = await boardApi.search(params);

      // 썸네일 URL 변환
      const keysToFetch = response.content
        .filter(item => item.thumbnail)
        .map(item => item.thumbnail!);

      const urlMap: Record<string, string> = {};
      if (keysToFetch.length > 0) {
        const urls = await Promise.allSettled(
          keysToFetch.map(key => s3Api.getPresignedViewUrl(key, 'BOARD'))
        );
        urls.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            urlMap[keysToFetch[idx]] = result.value;
          }
        });
      }

      const resultsWithUrls: BoardItemWithUrl[] = response.content.map(item => ({
        ...item,
        thumbnailUrl: item.thumbnail ? urlMap[item.thumbnail] : undefined,
      }));

      if (append) {
        setSearchResults(prev => [...prev, ...resultsWithUrls]);
      } else {
        setSearchResults(resultsWithUrls);
      }
      setSearchHasNext(response.hasNext);
      setSearchPage(page);
    } catch {
      // 검색 실패
    } finally {
      setSearchLoading(false);
    }
  }, [searchKeyword, selectedCategory, startDate, endDate]);

  // 검색 초기화
  const clearSearch = () => {
    setSearchKeyword('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setIsSearchMode(false);
    setSearchResults([]);
    setShowFilters(false);
  };

  // 검색 더보기
  const loadMoreSearch = () => {
    if (!searchLoading && searchHasNext) {
      executeSearch(searchPage + 1, true);
    }
  };

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (loading || loadingMore || !hasNext) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, loadingMore, hasNext, onLoadMore]);

  return (
    <>
      {/* Profile Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 16,
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 112,
            height: 112,
            borderRadius: '50%',
            backgroundImage: profileImageUrl ? `url("${profileImageUrl}")` : 'none',
            backgroundColor: profileImageUrl ? 'transparent' : styles.colors.gray100,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            border: `4px solid ${styles.colors.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {!profileImageUrl && (
              <span style={{
                fontSize: 48,
                color: styles.colors.gray400,
                fontFamily: 'Material Symbols Outlined',
              }}>person</span>
            )}
          </div>
          <div style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            backgroundColor: styles.colors.primary,
            color: 'white',
            padding: 6,
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <span style={{ fontSize: 14, fontFamily: 'Material Symbols Outlined' }}>favorite</span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: styles.colors.textDark, margin: 0 }}>
            Together Since
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: styles.colors.primary, margin: '4px 0' }}>
            {TOGETHER_SINCE.format('YYYY년 M월 D일')}
          </p>
          <p style={{
            fontSize: 28,
            fontWeight: 800,
            color: styles.colors.primary,
            margin: '8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}>
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 24 }}>favorite</span>
            D+{daysTogether}
          </p>
          <p style={{ fontSize: 14, color: styles.colors.textMuted, margin: 0 }}>
            {items.length}개의 추억을 함께 만들었어요
          </p>
        </div>
      </div>

      {/* 검색 영역 */}
      <div style={{ padding: '0 16px 16px' }}>
        {/* 검색바 */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'white',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${styles.colors.gray100}`,
          }}>
            <span style={{
              fontFamily: 'Material Symbols Outlined',
              fontSize: 20,
              color: styles.colors.gray400,
              marginRight: 10,
            }}>search</span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              placeholder="추억 검색..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 15,
                color: styles.colors.textDark,
                backgroundColor: 'transparent',
              }}
            />
            {isSearchMode && (
              <button
                onClick={clearSearch}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <span style={{
                  fontFamily: 'Material Symbols Outlined',
                  fontSize: 18,
                  color: styles.colors.gray400,
                }}>close</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${showFilters || selectedCategory || startDate || endDate ? styles.colors.primary : styles.colors.gray100}`,
              backgroundColor: showFilters || selectedCategory || startDate || endDate ? `${styles.colors.primary}15` : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{
              fontFamily: 'Material Symbols Outlined',
              fontSize: 20,
              color: showFilters || selectedCategory || startDate || endDate ? styles.colors.primary : styles.colors.gray400,
            }}>tune</span>
          </button>
          <button
            onClick={() => executeSearch()}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: styles.colors.primary,
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 2px 8px rgba(255,180,168,0.4)',
            }}
          >
            검색
          </button>
        </div>

        {/* 필터 영역 */}
        {showFilters && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${styles.colors.gray100}`,
            marginBottom: 12,
          }}>
            {/* 카테고리 */}
            <div style={{ marginBottom: 16 }}>
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: styles.colors.textMuted,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}>카테고리</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: selectedCategory === cat.value ? 'none' : `1px solid ${styles.colors.gray100}`,
                      backgroundColor: selectedCategory === cat.value ? styles.colors.primary : 'white',
                      color: selectedCategory === cat.value ? 'white' : styles.colors.textDark,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 날짜 범위 */}
            <div>
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: styles.colors.textMuted,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}>날짜 범위</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1px solid ${styles.colors.gray100}`,
                    fontSize: 14,
                    color: styles.colors.textDark,
                    backgroundColor: styles.colors.gray50,
                    minWidth: 0,
                  }}
                />
                <span style={{ color: styles.colors.gray400, flexShrink: 0 }}>~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1px solid ${styles.colors.gray100}`,
                    fontSize: 14,
                    color: styles.colors.textDark,
                    backgroundColor: styles.colors.gray50,
                    minWidth: 0,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 검색 결과 상태 표시 */}
        {isSearchMode && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <p style={{
              fontSize: 13,
              color: styles.colors.textMuted,
              margin: 0,
            }}>
              {searchLoading ? '검색 중...' : `${searchResults.length}개의 결과`}
            </p>
            <button
              onClick={clearSearch}
              style={{
                background: 'none',
                border: 'none',
                color: styles.colors.primary,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              초기화
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      {(() => {
        const displayItems = isSearchMode ? searchResults : items;
        const isLoading = isSearchMode ? searchLoading : loading;
        const displayHasNext = isSearchMode ? searchHasNext : hasNext;
        const displayLoadMore = isSearchMode ? loadMoreSearch : onLoadMore;
        const displayLoadingMore = isSearchMode ? searchLoading && searchResults.length > 0 : loadingMore;

        return (
          <div style={{ position: 'relative', paddingLeft: 16, paddingRight: 16 }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: 36,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: styles.colors.gray100,
              zIndex: 0,
            }} />

            {isLoading && displayItems.length === 0 ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 48,
              }}>
                <span style={{
                  fontSize: 32,
                  color: styles.colors.primary,
                  fontFamily: 'Material Symbols Outlined',
                  animation: 'spin 1s linear infinite',
                }}>progress_activity</span>
              </div>
            ) : displayItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: styles.colors.textMuted }}>
                <span style={{
                  fontSize: 48,
                  fontFamily: 'Material Symbols Outlined',
                  display: 'block',
                  marginBottom: 16,
                }}>{isSearchMode ? 'search_off' : 'photo_library'}</span>
                <p>{isSearchMode ? '검색 결과가 없습니다' : 'No memories yet. Create your first one!'}</p>
              </div>
            ) : (
              displayItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => onItemClick(item.id)}
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr',
                    gap: 16,
                    marginBottom: 32,
                    cursor: 'pointer',
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 8,
                  }}>
                    <div style={{
                      zIndex: 10,
                      backgroundColor: index === 0 ? styles.colors.primary : 'white',
                      borderRadius: '50%',
                      padding: 6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: index === 0 ? 'none' : `2px solid ${styles.colors.primary}30`,
                    }}>
                      <span style={{
                        fontSize: 16,
                        color: index === 0 ? 'white' : styles.colors.primary,
                        fontFamily: 'Material Symbols Outlined',
                        display: 'block',
                      }}>
                        {item.thumbnailUrl ? 'camera_alt' : 'edit_note'}
                      </span>
                    </div>
                  </div>

                  {/* Content card */}
                  <div
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                      border: `1px solid ${styles.colors.gray50}`,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}>
                      <p style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: styles.colors.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: 0,
                      }}>{formatDateRange(item.startDate, item.endDate)}</p>
                      {index === 0 && (
                        <span style={{
                          fontSize: 18,
                          color: styles.colors.primary,
                          fontFamily: 'Material Symbols Outlined',
                        }}>favorite</span>
                      )}
                    </div>

                    <h3 style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: styles.colors.textDark,
                      margin: '0 0 4px 0',
                      lineHeight: 1.3,
                    }}>{item.title}</h3>

                    {item.writer && (
                      <p style={{
                        fontSize: 12,
                        color: styles.colors.gray400,
                        margin: '0 0 12px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>person</span>
                        {item.writer}
                      </p>
                    )}

                    {!item.writer && <div style={{ marginBottom: 8 }} />}

                    {item.thumbnailUrl && (
                      <div style={{
                        borderRadius: 8,
                        overflow: 'hidden',
                        aspectRatio: '4/3',
                        backgroundColor: styles.colors.gray100,
                      }}>
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    {item.latitude != null && item.longitude != null && NAVER_MAP_CLIENT_ID && (
                      <div style={{
                        marginTop: item.thumbnailUrl ? 8 : 0,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: `1px solid ${styles.colors.gray100}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: styles.colors.gray50,
                      }}>
                        <img
                          src={`https://maps.apigw.ntruss.com/map-static/v2/raster-cors?w=120&h=120&scale=2&center=${item.longitude},${item.latitude}&level=15&markers=type:d|size:tiny|pos:${item.longitude}%20${item.latitude}&X-NCP-APIGW-API-KEY-ID=${NAVER_MAP_CLIENT_ID}`}
                          alt="위치"
                          style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0, display: 'block' }}
                          loading="lazy"
                        />
                        {item.place && (
                          <span style={{
                            fontSize: 12,
                            color: styles.colors.textMuted,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14, flexShrink: 0 }}>location_on</span>
                            {item.place}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Load more indicator */}
            <div
              ref={loadMoreRef}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                gap: 16,
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 8,
              }}>
                <div style={{
                  zIndex: 10,
                  width: 8,
                  height: 8,
                  backgroundColor: styles.colors.gray100,
                  borderRadius: '50%',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 48 }}>
                {displayLoadingMore ? (
                  <span style={{
                    fontSize: 24,
                    color: styles.colors.primary,
                    fontFamily: 'Material Symbols Outlined',
                    animation: 'spin 1s linear infinite',
                  }}>progress_activity</span>
                ) : displayHasNext ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); displayLoadMore(); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: styles.colors.textMuted,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    View older memories
                    <span style={{ fontSize: 12, fontFamily: 'Material Symbols Outlined' }}>expand_more</span>
                  </button>
                ) : displayItems.length > 0 ? (
                  <p style={{ color: styles.colors.gray400, fontSize: 12, margin: 0 }}>
                    No more memories
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default TimelineContent;

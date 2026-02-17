import { useRef, useEffect, useState, useCallback } from 'react';
import { boardApi, type BoardListItem, type BoardSearchParams } from '../../services/boardApi';
import { s3Api } from '../../services/s3Api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import '../../styles/TimelineContent.css';

dayjs.extend(relativeTime);
dayjs.locale('ko');

const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

// 사귀기 시작한 날짜
const TOGETHER_SINCE = dayjs('2026-01-03');

// 카테고리 목록
const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'DATE', label: '데이트' },
  { value: 'TRAVEL', label: '여행' },
  { value: 'FOOD', label: '맛집' },
  { value: 'FOOTBALL', label: '축구' },
  { value: 'DAILY', label: '일상' },
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

  if (!endDate || startDate.isSame(endDate, 'day')) {
    return formatDate(startDateStr);
  }

  if (startDate.isSame(endDate, 'month')) {
    return `${startDate.format('MMM D')}-${endDate.format('D, YYYY')}`;
  }

  if (startDate.isSame(endDate, 'year')) {
    return `${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}`;
  }

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
  const today = dayjs().startOf('day');
  const startDate = dayjs(TOGETHER_SINCE).startOf('day');
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

  const clearSearch = () => {
    setSearchKeyword('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setIsSearchMode(false);
    setSearchResults([]);
    setShowFilters(false);
  };

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

  const displayItems = isSearchMode ? searchResults : items;
  const isLoading = isSearchMode ? searchLoading : loading;
  const displayHasNext = isSearchMode ? searchHasNext : hasNext;
  const displayLoadMore = isSearchMode ? loadMoreSearch : onLoadMore;
  const displayLoadingMore = isSearchMode ? searchLoading && searchResults.length > 0 : loadingMore;

  const hasActiveFilters = showFilters || selectedCategory || startDate || endDate;

  return (
    <>
      {/* Profile Header */}
      <div className="timeline-profile-header">
        <div className="timeline-profile-image-wrapper">
          <div
            className={`timeline-profile-image ${!profileImageUrl ? 'empty' : ''}`}
            style={profileImageUrl ? { backgroundImage: `url("${profileImageUrl}")` } : undefined}
          >
            {!profileImageUrl && (
              <span className="icon icon-2xl" style={{ color: 'var(--color-gray-400)' }}>person</span>
            )}
          </div>
          <div className="timeline-profile-badge">
            <span className="icon icon-sm">favorite</span>
          </div>
        </div>
        <div className="timeline-profile-info">
          <p className="timeline-profile-title">둥이 커플이 함께한지❤️</p>
          <p className="timeline-profile-date">{TOGETHER_SINCE.format('YYYY년 M월 D일')}</p>
          <p className="timeline-profile-dday">
            <span className="icon icon-lg">favorite</span>
            D+{daysTogether}
          </p>
          <p className="timeline-profile-count">{items.length}개의 추억</p>
        </div>
      </div>

      {/* 검색 영역 */}
      <div className="timeline-search-container">
        <div className="timeline-search-bar">
          <div className="timeline-search-input-wrapper">
            <span className="icon icon-md timeline-search-icon">search</span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              placeholder="추억 검색..."
              className="timeline-search-input"
            />
            {isSearchMode && (
              <button onClick={clearSearch} className="btn btn-ghost">
                <span className="icon icon-md" style={{ color: 'var(--color-gray-400)' }}>close</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-icon ${hasActiveFilters ? 'active' : ''}`}
          >
            <span
              className="icon icon-md"
              style={{ color: hasActiveFilters ? 'var(--color-primary)' : 'var(--color-gray-400)' }}
            >tune</span>
          </button>
          <button onClick={() => executeSearch()} className="btn btn-primary">
            검색
          </button>
        </div>

        {/* 필터 영역 */}
        {showFilters && (
          <div className="timeline-filter-panel">
            <div className="timeline-filter-section">
              <p className="label">카테고리</p>
              <div className="timeline-filter-chips">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`chip ${selectedCategory === cat.value ? 'active' : ''}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="timeline-filter-section">
              <p className="label">날짜 범위</p>
              <div className="timeline-date-range">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input input-date"
                />
                <span className="timeline-date-separator">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input input-date"
                />
              </div>
            </div>
          </div>
        )}

        {/* 검색 결과 상태 */}
        {isSearchMode && (
          <div className="timeline-search-status">
            <p className="timeline-search-count">
              {searchLoading ? '검색 중...' : `${searchResults.length}개의 결과`}
            </p>
            <button onClick={clearSearch} className="timeline-search-reset">
              초기화
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="timeline-container">
        <div className="timeline-line" />

        {isLoading && displayItems.length === 0 ? (
          <div className="timeline-loading">
            <span className="icon icon-xl spinner" style={{ color: 'var(--color-primary)' }}>
              progress_activity
            </span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="timeline-empty">
            <span className="icon timeline-empty-icon">
              {isSearchMode ? 'search_off' : 'photo_library'}
            </span>
            <p>{isSearchMode ? '검색 결과가 없습니다' : 'No memories yet. Create your first one!'}</p>
          </div>
        ) : (
          displayItems.map((item, index) => (
            <div
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className="timeline-item"
            >
              {/* Timeline dot */}
              <div className="timeline-dot-wrapper">
                <div className={`timeline-dot ${index === 0 ? 'active' : 'inactive'}`}>
                  <span className="icon timeline-dot-icon">
                    {item.thumbnailUrl ? 'camera_alt' : 'edit_note'}
                  </span>
                </div>
              </div>

              {/* Content card */}
              <div className="card">
                <div className="timeline-card-header">
                  <p className="timeline-card-date">{formatDateRange(item.startDate, item.endDate)}</p>
                  {index === 0 && (
                    <span className="icon icon-md" style={{ color: 'var(--color-primary)' }}>favorite</span>
                  )}
                </div>

                <h3 className="timeline-card-title">{item.title}</h3>

                {item.writer && (
                  <p className="timeline-card-writer">
                    <span className="icon icon-sm">person</span>
                    {item.writer}
                  </p>
                )}

                {!item.writer && <div style={{ marginBottom: 8 }} />}

                {item.thumbnailUrl && (
                  <div className="timeline-card-thumbnail">
                    <img src={item.thumbnailUrl} alt={item.title} />
                  </div>
                )}

                {item.latitude != null && item.longitude != null && NAVER_MAP_CLIENT_ID && (
                  <div className="timeline-location" style={{ marginTop: item.thumbnailUrl ? 8 : 0 }}>
                    <img
                      src={`https://maps.apigw.ntruss.com/map-static/v2/raster-cors?w=120&h=120&scale=2&center=${item.longitude},${item.latitude}&level=15&markers=type:d|size:tiny|pos:${item.longitude}%20${item.latitude}&X-NCP-APIGW-API-KEY-ID=${NAVER_MAP_CLIENT_ID}`}
                      alt="위치"
                      className="timeline-location-map"
                      loading="lazy"
                    />
                    {item.place && (
                      <span className="timeline-location-text">
                        <span className="icon icon-sm" style={{ flexShrink: 0 }}>location_on</span>
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
        <div ref={loadMoreRef} className="timeline-load-more">
          <div className="timeline-dot-wrapper">
            <div className="timeline-load-more-dot" />
          </div>
          <div className="timeline-load-more-content">
            {displayLoadingMore ? (
              <span className="icon icon-lg spinner" style={{ color: 'var(--color-primary)' }}>
                progress_activity
              </span>
            ) : displayHasNext ? (
              <button
                onClick={(e) => { e.stopPropagation(); displayLoadMore(); }}
                className="timeline-load-more-btn"
              >
                View older memories
                <span className="icon icon-sm">expand_more</span>
              </button>
            ) : displayItems.length > 0 ? (
              <p className="timeline-end-text">No more memories</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default TimelineContent;

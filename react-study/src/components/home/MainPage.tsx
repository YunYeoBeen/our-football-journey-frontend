import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/userAuthStore';
import { useNavigate } from 'react-router-dom';
import { boardApi } from '../../services/boardApi';
import type { BoardListItem } from '../../services/boardApi';
import { s3Api } from '../../services/s3Api';
import AddMemoryModal from '../memory/AddMemoryModal';
import MemoryDetailModal from '../memory/MemoryDetailModal';

// 썸네일 URL 캐시 (key -> presigned URL)
const thumbnailCache = new Map<string, string>();

// 공통 스타일
const styles = {
  colors: {
    primary: '#ffb4a8',
    backgroundLight: '#fdfcfc',
    textDark: '#181110',
    textMuted: '#666666',
    textLight: '#999999',
    border: '#f3f3f3',
    gray100: '#f7f7f7',
    gray400: '#9ca3af',
    gray600: '#4b5563',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

// 아이콘 컴포넌트들
const HeartIcon = ({ filled = false, size = 28 }: { filled?: boolean; size?: number }) => (
  <span style={{
    fontSize: size,
    color: styles.colors.primary,
    fontFamily: 'Material Symbols Outlined',
    fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0"
  }}>
    favorite
  </span>
);

const PersonIcon = () => (
  <span style={{ fontSize: 24, color: styles.colors.gray600, fontFamily: 'Material Symbols Outlined' }}>
    person
  </span>
);

const LogoutIcon = () => (
  <span style={{ fontSize: 24, color: styles.colors.gray400, fontFamily: 'Material Symbols Outlined' }}>
    logout
  </span>
);

const GridIcon = ({ active = false }: { active?: boolean }) => (
  <span style={{
    fontSize: 28,
    color: active ? styles.colors.primary : styles.colors.gray400,
    fontFamily: 'Material Symbols Outlined',
    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0"
  }}>
    grid_view
  </span>
);

const TimelineIcon = ({ active = false }: { active?: boolean }) => (
  <span style={{
    fontSize: 28,
    color: active ? styles.colors.primary : styles.colors.gray400,
    fontFamily: 'Material Symbols Outlined'
  }}>
    timeline
  </span>
);

const CalendarIcon = ({ active = false }: { active?: boolean }) => (
  <span style={{
    fontSize: 28,
    color: active ? styles.colors.primary : styles.colors.gray400,
    fontFamily: 'Material Symbols Outlined'
  }}>
    calendar_today
  </span>
);

const AddIcon = () => (
  <span style={{ fontSize: 30, color: 'white', fontFamily: 'Material Symbols Outlined' }}>
    add
  </span>
);

const AutoAwesomeIcon = () => (
  <span style={{ fontSize: 24, color: styles.colors.primary, fontFamily: 'Material Symbols Outlined' }}>
    auto_awesome
  </span>
);

type TabType = 'feed' | 'timeline' | 'calendar';

// 아이템에 presigned URL을 추가한 타입
interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

const MainPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<BoardItemWithUrl[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleItemClick = (boardId: number) => {
    setSelectedBoardId(boardId);
    setIsDetailModalVisible(true);
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  // 데이터 가져오기
  const fetchItems = useCallback(async (pageNum: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await boardApi.getAllList(pageNum, 12);

      const itemsWithKeys = response.content.filter((item): item is BoardListItem & { thumbnail: string } => item.thumbnail !== null);
      const urlMap: Record<string, string> = {};

      if (itemsWithKeys.length > 0) {
        const keysToFetch = itemsWithKeys
          .filter(item => !thumbnailCache.has(item.thumbnail))
          .map(item => item.thumbnail);

        if (keysToFetch.length > 0) {
          const urls = await s3Api.getPresignedViewUrls(keysToFetch);
          keysToFetch.forEach((key, idx) => {
            thumbnailCache.set(key, urls[idx]);
            urlMap[key] = urls[idx];
          });
        }

        // 캐시에서 URL 가져오기
        itemsWithKeys.forEach(item => {
          if (thumbnailCache.has(item.thumbnail)) {
            urlMap[item.thumbnail] = thumbnailCache.get(item.thumbnail)!;
          }
        });
      }

      // thumbnailUrl 추가
      const itemsWithUrls: BoardItemWithUrl[] = response.content.map(item => ({
        ...item,
        thumbnailUrl: item.thumbnail ? urlMap[item.thumbnail] : undefined
      }));

      if (isLoadMore) {
        setItems(prev => [...prev, ...itemsWithUrls]);
      } else {
        setItems(itemsWithUrls);
      }

      setHasNext(response.hasNext);
      setPage(pageNum);
    } catch {
      // 게시물 조회 실패
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    fetchItems(0);
  }, [fetchItems]);

  // 무한스크롤 Observer 설정
  useEffect(() => {
    if (loading || loadingMore || !hasNext) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingMore) {
          fetchItems(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasNext, page, fetchItems]);

  const handleLogout = () => {
    fetch('http://localhost:8080/api/v1/logout', {
      method: 'POST',
      credentials: 'include',
    });
    localStorage.removeItem('accessToken');
    logout();
    navigate('/');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: styles.colors.backgroundLight,
        fontFamily: styles.fontFamily,
        color: styles.colors.textDark,
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(253, 252, 252, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${styles.colors.gray100}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeartIcon filled size={28} />
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: styles.colors.textDark,
                margin: 0,
              }}
            >
              Musahae
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: `${styles.colors.primary}20`,
                }}
              >
                <PersonIcon />
              </div>
              {user?.name && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: styles.colors.textDark,
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.colors.gray100}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 448, margin: '0 auto', paddingBottom: 96 }}>
        {/* Intro Card */}
        <div style={{ padding: '24px 16px 8px' }}>
          <div
            style={{
              backgroundColor: `${styles.colors.primary}1a`,
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: styles.colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 4,
                  margin: 0,
                }}
              >
                Our Journey
              </p>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: styles.colors.textDark,
                  margin: 0,
                }}
              >
                {items.length} Memories
              </p>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                backgroundColor: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px -4px rgba(255, 180, 168, 0.15)',
              }}
            >
              <AutoAwesomeIcon />
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        <div style={{ padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <HeartIcon filled size={32} />
              <p style={{ color: styles.colors.textMuted, marginTop: 8 }}>Loading...</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: styles.colors.gray100,
                    boxShadow: '0 4px 20px -4px rgba(255, 180, 168, 0.15)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundImage: item.thumbnailUrl ? `url("${item.thumbnailUrl}")` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      transition: 'transform 0.5s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading More Indicator / Infinite Scroll Trigger */}
        {!loading && items.length > 0 && (
          <div
            ref={loadMoreRef}
            style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}
          >
            {loadingMore ? (
              <div style={{ animation: 'bounce 1s infinite' }}>
                <HeartIcon filled size={32} />
              </div>
            ) : hasNext ? (
              <div style={{ animation: 'bounce 1s infinite', opacity: 0.5 }}>
                <HeartIcon filled size={32} />
              </div>
            ) : (
              <p style={{ color: styles.colors.textMuted, fontSize: 14 }}>
                All memories loaded
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <HeartIcon filled size={48} />
            <p style={{
              color: styles.colors.textMuted,
              marginTop: 16,
              fontSize: 16,
            }}>
              No memories yet
            </p>
            <p style={{
              color: styles.colors.textLight,
              fontSize: 14,
            }}>
              Tap + to add your first memory
            </p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${styles.colors.gray100}`,
          padding: '12px 24px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 448,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
          }}
        >
          <button
            onClick={() => setActiveTab('feed')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <div style={{ position: 'relative' }}>
              <GridIcon active={activeTab === 'feed'} />
              {activeTab === 'feed' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: styles.colors.primary,
                  }}
                />
              )}
            </div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeTab === 'feed' ? styles.colors.primary : styles.colors.gray400,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Feed
            </p>
          </button>

          <button
            onClick={() => navigate('/timeline')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <TimelineIcon active={activeTab === 'timeline'} />
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeTab === 'timeline' ? styles.colors.primary : styles.colors.gray400,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Timeline
            </p>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <CalendarIcon active={activeTab === 'calendar'} />
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeTab === 'calendar' ? styles.colors.primary : styles.colors.gray400,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Calendar
            </p>
          </button>
        </div>
      </nav>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalVisible(true)}
        style={{
          position: 'fixed',
          bottom: 96,
          right: 24,
          width: 56,
          height: 56,
          backgroundColor: styles.colors.primary,
          color: 'white',
          borderRadius: '50%',
          border: 'none',
          boxShadow: `0 8px 24px -4px ${styles.colors.primary}4d`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
          zIndex: 50,
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      >
        <AddIcon />
      </button>

      {/* Add Memory Modal */}
      <AddMemoryModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreated={() => {
          thumbnailCache.clear();
          fetchItems(0);
        }}
      />

      {/* Memory Detail Modal */}
      <MemoryDetailModal
        visible={isDetailModalVisible}
        boardId={selectedBoardId}
        onClose={() => setIsDetailModalVisible(false)}
        onDeleted={() => {
          // Refresh list after delete
          thumbnailCache.clear();
          fetchItems(0);
        }}
        onUpdated={() => {
          // Refresh list after update
          thumbnailCache.clear();
          fetchItems(0);
        }}
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-10px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default MainPage;

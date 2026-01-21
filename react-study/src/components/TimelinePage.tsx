import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/userAuthStore';
import { useNavigate } from 'react-router-dom';
import { boardApi } from '../services/boardApi';
import type { BoardListItem } from '../services/boardApi';
import { s3Api } from '../services/s3Api';
import AddMemoryModal from './AddMemoryModal';
import MemoryDetailModal from './MemoryDetailModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// 썸네일 URL 캐시
const thumbnailCache = new Map<string, string>();

const styles = {
  colors: {
    primary: '#ffb4a8',
    backgroundLight: '#fdfcfc',
    backgroundDark: '#121212',
    textDark: '#181110',
    textMuted: '#8d645e',
    gray50: '#f9fafb',
    gray100: '#f1f1f1',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
    gray800: '#1f2937',
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

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

// 아이템에 presigned URL을 추가한 타입
interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

const TimelinePage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<BoardItemWithUrl[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const { logout } = useAuthStore();
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

      const response = await boardApi.getAllList(pageNum, 10);

      // thumbnail이 있는 아이템들의 presigned URL 발급
      const itemsWithKeys = response.content.filter(
        (item): item is BoardListItem & { thumbnail: string } => item.thumbnail !== null
      );
      let urlMap: Record<string, string> = {};

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

        itemsWithKeys.forEach(item => {
          if (thumbnailCache.has(item.thumbnail)) {
            urlMap[item.thumbnail] = thumbnailCache.get(item.thumbnail)!;
          }
        });
      }

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
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchItems(0);
  }, [fetchItems]);

  // 무한 스크롤
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingMore && !loading) {
          fetchItems(page + 1, true);
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
  }, [hasNext, loadingMore, loading, page, fetchItems]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const refreshList = () => {
    thumbnailCache.clear();
    fetchItems(0);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: styles.colors.backgroundLight,
      fontFamily: styles.fontFamily,
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(253, 252, 252, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${styles.colors.gray100}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: 16,
          justifyContent: 'space-between',
          maxWidth: 448,
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: `2px solid ${styles.colors.primary}`,
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD26B0tdmK5hBDiMp95TOgqgUbc8JRafc-gmIXoKchz18PyWSip-V3t0NWyeL6DDS8UgigyJLhdiuTsDkblJJWgYG9SP20NR0QQ8QOzl40-NnApWEkhORhENUjeF16ofuwbaBUpqNtHlhufQ0j0hbN5vl9J_ulkts88s_ZEk8JtV_xvwztnWBdAF_A-JNuI43vzwpl_TS9Xup6P3uPdggt1T7aRyf2nVpjqmV1h5sCfmlyycC40TISBtyTp95AzAWIxNAUfhHQM6lvG")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
            <div>
              <h2 style={{
                fontSize: 16,
                fontWeight: 700,
                color: styles.colors.textDark,
                margin: 0,
                lineHeight: 1,
              }}>Musahae</h2>
              <p style={{
                fontSize: 10,
                color: styles.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 4,
                margin: 0,
              }}>Our Journey</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: styles.colors.textMuted,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 448, margin: '0 auto', paddingBottom: 96 }}>
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
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC2G979QXIbP5fBsZDx0LgwFqWps-7ayEs0tiR6dCU9eqfGvTNpviA_432xNbKkjQfL8LgtspPK4SM4nSwfrt6mLx5T8RAUMHOQbac1nnzl4wqaB3PVzBM7upJTz34b_P9KYA7my6G-gGm7ONsuB8B3TuwhH1WdbVogkydoqgvve5SEq-j_cBs7sAcWoubmwPxiM5ADhTnK8iqzPewUR01Q5d5ZPUdGzayX0BoVEZEsb2LDEu6wtGF18sP6fRAnqjA3L7o9_t-bfwNp")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              border: '4px solid white',
            }} />
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
            <p style={{
              fontSize: 24,
              fontWeight: 700,
              color: styles.colors.textDark,
              margin: 0,
            }}>Together Since</p>
            <p style={{
              fontSize: 18,
              fontWeight: 700,
              color: styles.colors.primary,
              margin: '4px 0',
            }}>Oct 12, 2023</p>
            <p style={{
              fontSize: 14,
              color: styles.colors.textMuted,
              margin: 0,
            }}>{items.length} memories shared & counting</p>
          </div>
        </div>

        {/* Timeline */}
        <div style={{
          position: 'relative',
          padding: '0 16px',
        }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute',
            left: 43,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: styles.colors.gray100,
            zIndex: 0,
          }} />

          {loading ? (
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
          ) : items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 48,
              color: styles.colors.textMuted,
            }}>
              <span style={{
                fontSize: 48,
                fontFamily: 'Material Symbols Outlined',
                display: 'block',
                marginBottom: 16,
              }}>photo_library</span>
              <p>No memories yet. Create your first one!</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item.id)}
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
                <div style={{
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
                    }}>{formatDate(item.date)}</p>
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
                    margin: '0 0 12px 0',
                    lineHeight: 1.3,
                  }}>{item.title}</h3>

                  {item.thumbnailUrl && (
                    <div style={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      marginBottom: 12,
                      aspectRatio: '4/3',
                      backgroundColor: styles.colors.gray100,
                    }}>
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
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
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: 48,
            }}>
              {loadingMore ? (
                <span style={{
                  fontSize: 24,
                  color: styles.colors.primary,
                  fontFamily: 'Material Symbols Outlined',
                  animation: 'spin 1s linear infinite',
                }}>progress_activity</span>
              ) : hasNext ? (
                <button
                  onClick={() => fetchItems(page + 1, true)}
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
              ) : items.length > 0 ? (
                <p style={{
                  color: styles.colors.gray400,
                  fontSize: 12,
                  margin: 0,
                }}>No more memories</p>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${styles.colors.gray100}`,
        padding: '12px 24px',
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 448,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: styles.colors.primary,
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontSize: 24,
              fontFamily: 'Material Symbols Outlined',
              fontVariationSettings: "'FILL' 1",
            }}>auto_awesome_motion</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>Timeline</span>
          </button>

          <button
            onClick={() => navigate('/main')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: styles.colors.gray400,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 24, fontFamily: 'Material Symbols Outlined' }}>grid_view</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>Gallery</span>
          </button>

          {/* Add button */}
          <div style={{ position: 'relative', top: -24 }}>
            <button
              onClick={() => setIsModalVisible(true)}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: styles.colors.primary,
                color: 'white',
                border: '4px solid white',
                boxShadow: `0 8px 24px ${styles.colors.primary}50`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 30, fontFamily: 'Material Symbols Outlined' }}>add</span>
            </button>
          </div>

          <button
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: styles.colors.gray400,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 24, fontFamily: 'Material Symbols Outlined' }}>sports_soccer</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>Tracker</span>
          </button>

          <button
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: styles.colors.gray400,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 24, fontFamily: 'Material Symbols Outlined' }}>settings</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>Settings</span>
          </button>
        </div>
      </nav>

      {/* Add Memory Modal */}
      <AddMemoryModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreated={refreshList}
      />

      {/* Memory Detail Modal */}
      <MemoryDetailModal
        visible={isDetailModalVisible}
        boardId={selectedBoardId}
        onClose={() => setIsDetailModalVisible(false)}
        onDeleted={refreshList}
        onUpdated={refreshList}
      />

      {/* Keyframe animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TimelinePage;

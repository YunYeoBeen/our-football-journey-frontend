import { useRef, useEffect } from 'react';
import type { BoardListItem } from '../services/boardApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

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
}

const TimelineContent: React.FC<TimelineContentProps> = ({
  items,
  loading,
  loadingMore,
  hasNext,
  onItemClick,
  onLoadMore,
}) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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
          <p style={{ fontSize: 24, fontWeight: 700, color: styles.colors.textDark, margin: 0 }}>
            Together Since
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: styles.colors.primary, margin: '4px 0' }}>
            Oct 12, 2023
          </p>
          <p style={{ fontSize: 14, color: styles.colors.textMuted, margin: 0 }}>
            {items.length} memories shared & counting
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', padding: '0 16px' }}>
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
          <div style={{ textAlign: 'center', padding: 48, color: styles.colors.textMuted }}>
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
            {loadingMore ? (
              <span style={{
                fontSize: 24,
                color: styles.colors.primary,
                fontFamily: 'Material Symbols Outlined',
                animation: 'spin 1s linear infinite',
              }}>progress_activity</span>
            ) : hasNext ? (
              <button
                onClick={(e) => { e.stopPropagation(); onLoadMore(); }}
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
              <p style={{ color: styles.colors.gray400, fontSize: 12, margin: 0 }}>
                No more memories
              </p>
            ) : null}
          </div>
        </div>
      </div>

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

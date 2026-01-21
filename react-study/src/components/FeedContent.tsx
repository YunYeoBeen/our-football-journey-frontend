import { useRef, useEffect } from 'react';
import type { BoardListItem } from '../services/boardApi';

const styles = {
  colors: {
    primary: '#ffb4a8',
    textDark: '#181110',
    textMuted: '#666666',
    textLight: '#999999',
    gray100: '#f7f7f7',
  },
};

// 아이콘 컴포넌트
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

const AutoAwesomeIcon = () => (
  <span style={{ fontSize: 24, color: styles.colors.primary, fontFamily: 'Material Symbols Outlined' }}>
    auto_awesome
  </span>
);

interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

interface FeedContentProps {
  items: BoardItemWithUrl[];
  loading: boolean;
  loadingMore: boolean;
  hasNext: boolean;
  onItemClick: (boardId: number) => void;
  onLoadMore: () => void;
}

const FeedContent: React.FC<FeedContentProps> = ({
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
            <p style={{
              fontSize: 12,
              fontWeight: 600,
              color: styles.colors.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0,
              marginBottom: 4,
            }}>
              Our Journey
            </p>
            <p style={{
              fontSize: 18,
              fontWeight: 700,
              color: styles.colors.textDark,
              margin: 0,
            }}>
              {items.length} Memories
            </p>
          </div>
          <div style={{
            width: 48,
            height: 48,
            backgroundColor: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px -4px rgba(255, 180, 168, 0.15)',
          }}>
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}>
            {items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                onClick={() => onItemClick(item.id)}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {!item.thumbnailUrl && (
                    <span style={{
                      fontSize: 32,
                      color: styles.colors.primary,
                      fontFamily: 'Material Symbols Outlined',
                      opacity: 0.5,
                    }}>image</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading More / Infinite Scroll Trigger */}
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
          <p style={{ color: styles.colors.textMuted, marginTop: 16, fontSize: 16 }}>
            No memories yet
          </p>
          <p style={{ color: styles.colors.textLight, fontSize: 14 }}>
            Tap + to add your first memory
          </p>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-10px); opacity: 0.6; }
        }
      `}</style>
    </>
  );
};

export default FeedContent;

import { useState, useMemo } from 'react';
import type { BoardListItem } from '../services/boardApi';
import dayjs from 'dayjs';

const styles = {
  colors: {
    primary: '#ffb4a8',
    textDark: '#181110',
    textMuted: '#8d645e',
    gray100: '#f1f1f1',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
  },
};

interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

interface CalendarContentProps {
  items: BoardItemWithUrl[];
  loading: boolean;
  onItemClick: (boardId: number) => void;
}

const CalendarContent: React.FC<CalendarContentProps> = ({
  items,
  loading,
  onItemClick,
}) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // 해당 월의 아이템들을 날짜별로 그룹화
  const itemsByDate = useMemo(() => {
    const map = new Map<string, BoardItemWithUrl[]>();
    items.forEach(item => {
      const dateKey = dayjs(item.date).format('YYYY-MM-DD');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(item);
    });
    return map;
  }, [items]);

  // 달력 날짜 배열 생성
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0 = Sunday
    const daysInMonth = endOfMonth.date();

    const days: (dayjs.Dayjs | null)[] = [];

    // 이전 달 빈 칸
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(currentMonth.date(i));
    }

    return days;
  }, [currentMonth]);

  const goToPrevMonth = () => {
    setCurrentMonth(prev => prev.subtract(1, 'month'));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => prev.add(1, 'month'));
  };

  const today = dayjs();

  return (
    <div style={{ padding: 16 }}>
      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        padding: '0 8px',
      }}>
        <button
          onClick={goToPrevMonth}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: 24,
            color: styles.colors.textMuted,
            fontFamily: 'Material Symbols Outlined',
          }}>chevron_left</span>
        </button>

        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: styles.colors.textDark,
          margin: 0,
        }}>
          {currentMonth.format('MMMM YYYY')}
        </h2>

        <button
          onClick={goToNextMonth}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: 24,
            color: styles.colors.textMuted,
            fontFamily: 'Material Symbols Outlined',
          }}>chevron_right</span>
        </button>
      </div>

      {/* Day Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        marginBottom: 8,
      }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: styles.colors.gray400,
            padding: '8px 0',
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
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
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}>
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} style={{ aspectRatio: '1' }} />;
            }

            const dateKey = day.format('YYYY-MM-DD');
            const dayItems = itemsByDate.get(dateKey) || [];
            const hasItems = dayItems.length > 0;
            const isToday = day.isSame(today, 'day');

            return (
              <div
                key={dateKey}
                onClick={() => hasItems && onItemClick(dayItems[0].id)}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: hasItems ? `${styles.colors.primary}15` : 'transparent',
                  border: isToday ? `2px solid ${styles.colors.primary}` : 'none',
                  cursor: hasItems ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (hasItems) e.currentTarget.style.backgroundColor = `${styles.colors.primary}25`;
                }}
                onMouseLeave={(e) => {
                  if (hasItems) e.currentTarget.style.backgroundColor = `${styles.colors.primary}15`;
                }}
              >
                <span style={{
                  fontSize: 14,
                  fontWeight: isToday || hasItems ? 600 : 400,
                  color: hasItems ? styles.colors.primary : styles.colors.textDark,
                }}>
                  {day.date()}
                </span>

                {hasItems && (
                  <div style={{
                    position: 'absolute',
                    bottom: 4,
                    display: 'flex',
                    gap: 2,
                  }}>
                    {dayItems.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: styles.colors.primary,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Month Items List */}
      {!loading && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: styles.colors.textMuted,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Memories in {currentMonth.format('MMMM')}
          </h3>

          {items
            .filter(item => dayjs(item.date).isSame(currentMonth, 'month'))
            .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
            .map(item => (
              <div
                key={item.id}
                onClick={() => onItemClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: 'white',
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                {item.thumbnailUrl ? (
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundImage: `url("${item.thumbnailUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: styles.colors.gray100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontSize: 20,
                      color: styles.colors.gray400,
                      fontFamily: 'Material Symbols Outlined',
                    }}>edit_note</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: styles.colors.textDark,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.title}
                  </p>
                  <p style={{
                    fontSize: 12,
                    color: styles.colors.textMuted,
                    margin: 0,
                  }}>
                    {dayjs(item.date).format('MMM D')}
                  </p>
                </div>
                <span style={{
                  fontSize: 20,
                  color: styles.colors.gray400,
                  fontFamily: 'Material Symbols Outlined',
                }}>chevron_right</span>
              </div>
            ))}

          {items.filter(item => dayjs(item.date).isSame(currentMonth, 'month')).length === 0 && (
            <p style={{
              textAlign: 'center',
              color: styles.colors.gray400,
              fontSize: 14,
              padding: 24,
            }}>
              No memories in {currentMonth.format('MMMM')}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CalendarContent;

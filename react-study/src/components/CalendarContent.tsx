import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { BoardListItem } from '../services/boardApi';
import { matchApi } from '../services/matchApi';
import type { CalendarEventDto, MatchAttendanceStatus } from '../services/matchApi';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

const colors = {
  primary: '#ffb4a8',
  ulsanBlue: '#004A9F',
  attending: '#22c55e',
  notAttending: '#ef4444',
  unknown: '#f59e0b',
  textDark: '#181110',
  textMuted: '#8d645e',
  gray100: '#f1f1f1',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
};

interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

interface CalendarContentProps {
  items: BoardItemWithUrl[];
  loading: boolean;
  onItemClick: (boardId: number) => void;
  onDateSelect?: (date: string | null) => void;
}

type ViewMode = 'month' | 'week';

const CalendarContent: React.FC<CalendarContentProps> = ({
  items,
  loading,
  onItemClick,
  onDateSelect,
}) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDto[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<number | null>(null);
  const [attendanceUpdating, setAttendanceUpdating] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);

  // Drag handle state for resizing
  const [isDragging, setIsDragging] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const startHeight = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [measuredWeekHeight, setMeasuredWeekHeight] = useState(52);

  // Generate weeks array
  const calendarWeeks = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = endOfMonth.date();

    const days: (dayjs.Dayjs | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(currentMonth.date(i));
    }
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    const weeks: (dayjs.Dayjs | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentMonth]);

  // Measure actual grid height with ResizeObserver
  useEffect(() => {
    const measureGrid = () => {
      if (gridRef.current && calendarWeeks.length > 0) {
        const gridHeight = gridRef.current.offsetHeight;
        const rowHeight = gridHeight / calendarWeeks.length;
        if (rowHeight > 0 && rowHeight !== measuredWeekHeight) {
          setMeasuredWeekHeight(rowHeight);
        }
      }
    };

    // Initial measure after render
    requestAnimationFrame(measureGrid);

    // Observe size changes
    const observer = new ResizeObserver(measureGrid);
    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => observer.disconnect();
  }, [calendarWeeks.length, measuredWeekHeight]);

  // Grid heights - use measured height
  const weekHeight = measuredWeekHeight;
  const monthHeight = calendarWeeks.length * weekHeight;

  // Initialize calendar height
  useEffect(() => {
    if (calendarHeight === null) {
      setCalendarHeight(viewMode === 'month' ? monthHeight : weekHeight);
    }
  }, [calendarHeight, viewMode, monthHeight, weekHeight]);

  // Update height when month changes
  useEffect(() => {
    if (viewMode === 'month' && !isDragging) {
      setCalendarHeight(monthHeight);
    }
  }, [monthHeight, viewMode, isDragging]);

  // Drag handlers
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    startHeight.current = calendarHeight ?? monthHeight;
  }, [calendarHeight, monthHeight]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const deltaY = clientY - dragStartY.current;
    const newHeight = Math.max(weekHeight, Math.min(monthHeight, startHeight.current + deltaY));
    setCalendarHeight(newHeight);
  }, [isDragging, monthHeight]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = (monthHeight + weekHeight) / 2;
    if ((calendarHeight ?? monthHeight) < threshold) {
      setCalendarHeight(weekHeight);
      setViewMode('week');
      console.log('[viewMode] switched to week');
    } else {
      setCalendarHeight(monthHeight);
      setViewMode('month');
      console.log('[viewMode] switched to month');
    }
  }, [isDragging, calendarHeight, monthHeight]);

  // Touch handlers for drag handle
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse handlers for drag handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  }, [handleDragStart]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onUp = () => handleDragEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Swipe gesture for week navigation (horizontal)
  const goToNextWeek = useCallback(() => {
    if (activeWeekIndex < calendarWeeks.length - 1) {
      setActiveWeekIndex(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev.add(1, 'month'));
      setActiveWeekIndex(0);
    }
  }, [activeWeekIndex, calendarWeeks.length]);

  const goToPrevWeek = useCallback(() => {
    if (activeWeekIndex > 0) {
      setActiveWeekIndex(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev.subtract(1, 'month'));
      setActiveWeekIndex(999);
    }
  }, [activeWeekIndex]);

  const horizontalSwipe = useSwipeGesture({
    onSwipeLeft: () => {
      if (viewMode === 'week') {
        goToNextWeek();
      } else {
        goToNextMonth();
      }
    },
    onSwipeRight: () => {
      if (viewMode === 'week') {
        goToPrevWeek();
      } else {
        goToPrevMonth();
      }
    },
    threshold: 50,
  });

  const handleAttendanceChange = async (matchId: number, status: MatchAttendanceStatus) => {
    if (attendanceUpdating) return;
    setAttendanceUpdating(true);
    try {
      await matchApi.updateAttendance(matchId, status);
      setCalendarEvents(prev =>
        prev.map(event =>
          event.matchId === matchId
            ? {
                ...event,
                attendanceStatus: status,
                attendances: event.attendances?.map((person, i) =>
                  i === 0 ? { ...person, status } : person
                )
              }
            : event
        )
      );
    } catch {
      // 참석 상태 업데이트 실패
    } finally {
      setAttendanceUpdating(false);
      setHoveredMatchId(null);
    }
  };

  const handleMatchMouseEnter = (matchId: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredMatchId(matchId);
  };

  const handleMatchMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMatchId(null);
    }, 200);
  };

  // Fetch calendar events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      setEventsLoading(true);
      try {
        const start = currentMonth.startOf('month').format('YYYY-MM-DDTHH:mm:ss');
        const end = currentMonth.endOf('month').format('YYYY-MM-DDTHH:mm:ss');
        const response = await matchApi.getCalendar(start, end);
        setCalendarEvents(response.events);
      } catch {
        setCalendarEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchCalendarEvents();
  }, [currentMonth]);

  // Group events by date (considering date ranges)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>();
    calendarEvents.forEach(event => {
      const startDate = dayjs(event.startDate);
      const endDate = event.endDate ? dayjs(event.endDate) : startDate;

      // Add event to all dates in the range
      let current = startDate;
      while (current.isBefore(endDate, 'day') || current.isSame(endDate, 'day')) {
        const dateKey = current.format('YYYY-MM-DD');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(event);
        current = current.add(1, 'day');
      }
    });
    return map;
  }, [calendarEvents]);

  // Update activeWeekIndex when selectedDate or month changes
  useEffect(() => {
    const today = dayjs();
    const targetDate = selectedDate ? dayjs(selectedDate) : today;

    if (targetDate.month() === currentMonth.month() && targetDate.year() === currentMonth.year()) {
      const weekIdx = calendarWeeks.findIndex(week =>
        week.some(day => day && day.isSame(targetDate, 'day'))
      );
      if (weekIdx >= 0) {
        setActiveWeekIndex(weekIdx);
      }
    } else {
      setActiveWeekIndex(0);
    }
  }, [selectedDate, currentMonth, calendarWeeks]);

  const goToPrevMonth = () => {
    setCurrentMonth(prev => prev.subtract(1, 'month'));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => prev.add(1, 'month'));
  };

  // Clamp activeWeekIndex when weeks change
  useEffect(() => {
    if (activeWeekIndex >= calendarWeeks.length) {
      setActiveWeekIndex(Math.max(0, calendarWeeks.length - 1));
    }
  }, [calendarWeeks.length, activeWeekIndex]);

  const handleDateClick = (dateKey: string) => {
    const newSelected = selectedDate === dateKey ? null : dateKey;
    setSelectedDate(newSelected);
    onDateSelect?.(newSelected);
  };

  // Format date range for display
  const formatEventDateRange = (startDateStr: string, endDateStr?: string): string => {
    const startDate = dayjs(startDateStr);
    const endDate = endDateStr ? dayjs(endDateStr) : null;

    // Single day or no end date
    if (!endDate || startDate.isSame(endDate, 'day')) {
      return startDate.format('M월 D일 (ddd)');
    }

    // Same month: "1월 15-17일"
    if (startDate.isSame(endDate, 'month')) {
      return `${startDate.format('M월 D')}-${endDate.format('D일 (ddd)')}`;
    }

    // Different month: "1월 30일 - 2월 2일"
    return `${startDate.format('M월 D일')} - ${endDate.format('M월 D일 (ddd)')}`;
  };

  const today = dayjs();

  // Events for the selected date (week view detail panel)
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return calendarEvents
      .filter(e => {
        const startDate = dayjs(e.startDate);
        const endDate = e.endDate ? dayjs(e.endDate) : startDate;
        const selected = dayjs(selectedDate);
        return (selected.isAfter(startDate, 'day') || selected.isSame(startDate, 'day')) &&
               (selected.isBefore(endDate, 'day') || selected.isSame(endDate, 'day'));
      })
      .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));
  }, [calendarEvents, selectedDate]);

  // Events for the current week (week view)
  const weekEvents = useMemo(() => {
    const currentWeek = calendarWeeks[activeWeekIndex];
    console.log('[weekEvents] activeWeekIndex:', activeWeekIndex, 'currentWeek:', currentWeek);
    if (!currentWeek) return [];

    const weekDays = currentWeek.filter((day): day is dayjs.Dayjs => day !== null);
    if (weekDays.length === 0) return [];

    const weekStart = weekDays[0];
    const weekEnd = weekDays[weekDays.length - 1];
    console.log('[weekEvents] weekStart:', weekStart.format('YYYY-MM-DD'), 'weekEnd:', weekEnd.format('YYYY-MM-DD'));
    console.log('[weekEvents] calendarEvents count:', calendarEvents.length);

    const filtered = calendarEvents
      .filter(e => {
        const eventStart = dayjs(e.startDate);
        const eventEnd = e.endDate ? dayjs(e.endDate) : eventStart;
        // Event overlaps with week if: eventStart <= weekEnd AND eventEnd >= weekStart
        return (eventStart.isBefore(weekEnd, 'day') || eventStart.isSame(weekEnd, 'day')) &&
               (eventEnd.isAfter(weekStart, 'day') || eventEnd.isSame(weekStart, 'day'));
      })
      .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

    console.log('[weekEvents] filtered count:', filtered.length, filtered);
    return filtered;
  }, [calendarEvents, calendarWeeks, activeWeekIndex]);

  // Events list for month view (all or filtered)
  const sortedEvents = useMemo(() => {
    const filtered = selectedDate
      ? calendarEvents.filter(e => {
          const startDate = dayjs(e.startDate);
          const endDate = e.endDate ? dayjs(e.endDate) : startDate;
          const selected = dayjs(selectedDate);
          return (selected.isAfter(startDate, 'day') || selected.isSame(startDate, 'day')) &&
                 (selected.isBefore(endDate, 'day') || selected.isSame(endDate, 'day'));
        })
      : calendarEvents;
    return [...filtered].sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));
  }, [calendarEvents, selectedDate]);

  // Render a single day cell
  const renderDayCell = (day: dayjs.Dayjs | null, index: number) => {
    if (!day) {
      return <div key={`empty-${index}`} style={{ aspectRatio: '1' }} />;
    }

    const dateKey = day.format('YYYY-MM-DD');
    const dayEvents = eventsByDate.get(dateKey) || [];
    const hasBoard = dayEvents.some(e => e.type === 'BOARD');
    const matchEvent = dayEvents.find(e => e.type === 'MATCH');
    const hasMatch = !!matchEvent;
    const anyoneAttending = matchEvent?.attendances?.some(a => a.status === 'ATTENDING');
    const isToday = day.isSame(today, 'day');
    const dayOfWeek = day.day();
    const isSelected = selectedDate === dateKey;

    let bgColor = 'transparent';
    if (hasBoard && hasMatch) {
      bgColor = anyoneAttending
        ? `linear-gradient(135deg, ${colors.primary}20, ${colors.attending}20)`
        : `linear-gradient(135deg, ${colors.primary}20, ${colors.ulsanBlue}20)`;
    } else if (hasBoard) {
      bgColor = `${colors.primary}15`;
    } else if (hasMatch) {
      bgColor = anyoneAttending ? `${colors.attending}15` : `${colors.ulsanBlue}15`;
    }

    return (
      <div
        key={dateKey}
        onClick={() => handleDateClick(dateKey)}
        style={{
          aspectRatio: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: bgColor.includes('gradient') ? undefined : bgColor,
          background: bgColor.includes('gradient') ? bgColor : undefined,
          border: isSelected ? `2px solid ${colors.ulsanBlue}` : isToday ? `2px solid ${colors.primary}` : 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
          minHeight: 44,
        }}
      >
        <span style={{
          fontSize: 14,
          fontWeight: isToday || hasBoard || hasMatch ? 600 : 400,
          color: dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#3b82f6' : colors.textDark,
        }}>
          {day.date()}
        </span>

        <div style={{
          position: 'absolute',
          bottom: 4,
          display: 'flex',
          gap: 2,
        }}>
          {hasBoard && (
            <div style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: colors.primary,
            }} />
          )}
          {hasMatch && matchEvent?.attendances?.map((person, i) => (
            <div key={i} style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: person.status === 'ATTENDING'
                ? colors.attending
                : person.status === 'NOT_ATTENDING'
                  ? colors.notAttending
                  : person.status === 'UNSURE'
                    ? colors.unknown
                    : colors.ulsanBlue,
            }} />
          ))}
        </div>
      </div>
    );
  };

  // Render event card
  const renderEventCard = (event: CalendarEventDto, idx: number) => {
    if (event.type === 'BOARD') {
      const item = items.find(i => i.id === event.boardId);
      return (
        <div
          key={`board-${event.boardId}-${idx}`}
          onClick={() => event.boardId && onItemClick(event.boardId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: 8,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            borderLeft: `4px solid ${colors.primary}`,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
        >
          {item?.thumbnailUrl ? (
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
              backgroundColor: `${colors.primary}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 20,
                color: colors.primary,
                fontFamily: 'Material Symbols Outlined',
              }}>favorite</span>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textDark,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {event.title}
            </p>
            <p style={{
              fontSize: 12,
              color: colors.textMuted,
              margin: 0,
            }}>
              {formatEventDateRange(event.startDate, event.endDate)}
            </p>
          </div>
          <span style={{
            fontSize: 20,
            color: colors.gray400,
            fontFamily: 'Material Symbols Outlined',
          }}>chevron_right</span>
        </div>
      );
    }

    // MATCH event
    const myStatus = event.attendanceStatus || event.attendances?.[0]?.status || undefined;
    const isHovered = hoveredMatchId === event.matchId;

    const statusColor = myStatus === 'ATTENDING'
      ? colors.attending
      : myStatus === 'NOT_ATTENDING'
        ? colors.notAttending
        : myStatus === 'UNSURE'
          ? colors.unknown
          : colors.ulsanBlue;

    const statusLabel = myStatus === 'ATTENDING' ? '직관'
      : myStatus === 'NOT_ATTENDING' ? '불참'
        : myStatus === 'UNSURE' ? '불확실' : undefined;

    const statusIcon = myStatus === 'ATTENDING' ? 'stadium'
      : myStatus === 'NOT_ATTENDING' ? 'cancel'
        : myStatus === 'UNSURE' ? 'help' : undefined;

    return (
      <div
        key={`match-${event.matchId}-${idx}`}
        onMouseEnter={() => event.matchId && handleMatchMouseEnter(event.matchId)}
        onMouseLeave={handleMatchMouseLeave}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          backgroundColor: 'white',
          borderRadius: 12,
          marginBottom: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          borderLeft: `4px solid ${statusColor}`,
          transition: 'box-shadow 0.2s',
        }}
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: `${statusColor}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 20,
            color: statusColor,
            fontFamily: 'Material Symbols Outlined',
          }}>sports_soccer</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: colors.textDark,
            margin: 0,
          }}>
            {event.title}
          </p>
          <p style={{
            fontSize: 12,
            color: colors.textMuted,
            margin: 0,
          }}>
            {dayjs(event.startDate).format('M월 D일 (ddd) HH:mm')}
          </p>
          {event.attendances && event.attendances.length > 0 && (
            <p style={{
              fontSize: 11,
              color: colors.textMuted,
              margin: '3px 0 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexWrap: 'wrap',
            }}>
              {event.attendances.map((person, i) => {
                const label = person.status === 'ATTENDING' ? '직관'
                  : person.status === 'NOT_ATTENDING' ? '불참'
                    : person.status === 'UNSURE' ? '불확실' : '미정';
                const color = person.status === 'ATTENDING' ? colors.attending
                  : person.status === 'NOT_ATTENDING' ? colors.notAttending
                    : person.status === 'UNSURE' ? colors.unknown
                      : colors.gray400;
                return (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {i > 0 && <span style={{ color: colors.gray400, margin: '0 2px' }}>/</span>}
                    <span style={{ fontWeight: 600 }}>{person.name}</span>
                    <span style={{ color, fontWeight: 600 }}>{label}</span>
                  </span>
                );
              })}
            </p>
          )}
        </div>
        {statusLabel && !isHovered && (
          <div style={{
            padding: '4px 8px',
            borderRadius: 6,
            backgroundColor: `${statusColor}15`,
            fontSize: 11,
            fontWeight: 600,
            color: statusColor,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>{statusIcon}</span>
            {statusLabel}
          </div>
        )}

        {/* Attendance hover popup */}
        {isHovered && event.matchId && (
          <div
            onMouseEnter={() => event.matchId && handleMatchMouseEnter(event.matchId)}
            onMouseLeave={handleMatchMouseLeave}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 6,
              padding: '6px 8px',
              backgroundColor: 'white',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              border: `1px solid ${colors.gray200}`,
              animation: 'fadeIn 0.15s ease',
              zIndex: 10,
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleAttendanceChange(event.matchId!, 'ATTENDING'); }}
              disabled={attendanceUpdating}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 10px',
                border: 'none',
                borderRadius: 8,
                backgroundColor: myStatus === 'ATTENDING' ? `${colors.attending}20` : 'transparent',
                cursor: attendanceUpdating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!attendanceUpdating) e.currentTarget.style.backgroundColor = `${colors.attending}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = myStatus === 'ATTENDING' ? `${colors.attending}20` : 'transparent'; }}
            >
              <span style={{ fontSize: 18, fontFamily: 'Material Symbols Outlined', color: colors.attending }}>check_circle</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: colors.attending }}>참석</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleAttendanceChange(event.matchId!, 'NOT_ATTENDING'); }}
              disabled={attendanceUpdating}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 10px',
                border: 'none',
                borderRadius: 8,
                backgroundColor: myStatus === 'NOT_ATTENDING' ? `${colors.notAttending}20` : 'transparent',
                cursor: attendanceUpdating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!attendanceUpdating) e.currentTarget.style.backgroundColor = `${colors.notAttending}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = myStatus === 'NOT_ATTENDING' ? `${colors.notAttending}20` : 'transparent'; }}
            >
              <span style={{ fontSize: 18, fontFamily: 'Material Symbols Outlined', color: colors.notAttending }}>cancel</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: colors.notAttending }}>불참</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleAttendanceChange(event.matchId!, 'UNSURE'); }}
              disabled={attendanceUpdating}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 10px',
                border: 'none',
                borderRadius: 8,
                backgroundColor: myStatus === 'UNSURE' ? `${colors.unknown}20` : 'transparent',
                cursor: attendanceUpdating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!attendanceUpdating) e.currentTarget.style.backgroundColor = `${colors.unknown}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = myStatus === 'UNSURE' ? `${colors.unknown}20` : 'transparent'; }}
            >
              <span style={{ fontSize: 18, fontFamily: 'Material Symbols Outlined', color: colors.unknown }}>help</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: colors.unknown }}>불확실</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 16, userSelect: 'none' }}>
      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}>
        {[
          { color: colors.primary, label: '데이트' },
          { color: colors.ulsanBlue, label: '경기' },
          { color: colors.attending, label: '직관' },
          { color: colors.notAttending, label: '불참' },
          { color: colors.unknown, label: '불확실' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }} />
            <span style={{ fontSize: 11, color: colors.textMuted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
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
            color: colors.textMuted,
            fontFamily: 'Material Symbols Outlined',
          }}>chevron_left</span>
        </button>

        <h2 style={{
          fontSize: 18,
          fontWeight: 700,
          color: colors.textDark,
          margin: 0,
        }}>
          {currentMonth.format('YYYY년 M월')}
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
            color: colors.textMuted,
            fontFamily: 'Material Symbols Outlined',
          }}>chevron_right</span>
        </button>
      </div>

      {/* Day Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        marginBottom: 4,
      }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: idx === 0 ? '#ef4444' : idx === 6 ? '#3b82f6' : colors.gray400,
            padding: '6px 0',
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {(loading || eventsLoading) ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 48,
        }}>
          <span style={{
            fontSize: 32,
            color: colors.primary,
            fontFamily: 'Material Symbols Outlined',
            animation: 'spin 1s linear infinite',
          }}>progress_activity</span>
        </div>
      ) : (
        <div style={{ touchAction: 'none' }}>
          <div style={{
            overflow: 'hidden',
            transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            height: (calendarHeight ?? monthHeight) + 8,
            paddingBottom: 8,
          }}>
            {viewMode === 'month' ? (
              <div
                ref={gridRef}
                {...horizontalSwipe}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                  touchAction: 'pan-y',
                }}
              >
                {calendarWeeks.flat().map((day, index) => renderDayCell(day, index))}
              </div>
            ) : (
              <div
                {...horizontalSwipe}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                }}
              >
                {calendarWeeks[activeWeekIndex]?.map((day, index) => renderDayCell(day, index))}
              </div>
            )}
          </div>

          {/* Drag Handle */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px 0',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <div style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: isDragging ? colors.primary : colors.gray200,
              transition: 'background-color 0.15s',
            }} />
          </div>
        </div>
      )}

      {/* Week View: Events Panel */}
      {(() => { console.log('[RENDER] viewMode:', viewMode, 'weekEvents.length:', weekEvents.length); return null; })()}
      {viewMode === 'week' && (
        <div style={{
          marginTop: 8,
          animation: 'slideUp 0.2s ease',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textMuted,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>event</span>
              {selectedDate
                ? dayjs(selectedDate).format('M월 D일 (ddd)') + ' 일정'
                : (() => {
                    const week = calendarWeeks[activeWeekIndex];
                    const firstDay = week?.find(d => d !== null);
                    const lastDay = [...(week || [])].reverse().find(d => d !== null);
                    if (firstDay && lastDay) {
                      return `${firstDay.format('M/D')} - ${lastDay.format('M/D')} 일정`;
                    }
                    return '이번 주 일정';
                  })()}
            </h3>
            {selectedDate && (
              <button
                onClick={() => { setSelectedDate(null); onDateSelect?.(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.ulsanBlue,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                전체 보기
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>close</span>
              </button>
            )}
          </div>
          {(selectedDate ? selectedDayEvents : weekEvents).length === 0 ? (
            <p style={{
              textAlign: 'center',
              color: colors.gray400,
              fontSize: 14,
              padding: 24,
            }}>
              {selectedDate ? '이 날 일정이 없습니다' : '이번 주 일정이 없습니다'}
            </p>
          ) : (
            (selectedDate ? selectedDayEvents : weekEvents).map((event, idx) => renderEventCard(event, idx))
          )}
        </div>
      )}

      {/* Month View: Events List */}
      {viewMode === 'month' && !loading && !eventsLoading && (
        <div style={{ marginTop: 8 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textMuted,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>calendar_month</span>
              {selectedDate
                ? dayjs(selectedDate).format('M월 D일 (ddd)') + ' 일정'
                : currentMonth.format('M월') + ' 일정'}
            </h3>
            {selectedDate && (
              <button
                onClick={() => { setSelectedDate(null); onDateSelect?.(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.ulsanBlue,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                전체 보기
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>close</span>
              </button>
            )}
          </div>

          {sortedEvents.length === 0 ? (
            <p style={{
              textAlign: 'center',
              color: colors.gray400,
              fontSize: 14,
              padding: 24,
            }}>
              이번 달 일정이 없습니다
            </p>
          ) : (
            sortedEvents.map((event, idx) => renderEventCard(event, idx))
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-50%) scale(0.9); }
          to { opacity: 1; transform: translateY(-50%) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CalendarContent;

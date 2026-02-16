import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { BoardListItem } from '../services/boardApi';
import { matchApi } from '../services/matchApi';
import type { CalendarEventDto, MatchAttendanceStatus } from '../services/matchApi';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import '../styles/CalendarContent.css';

dayjs.locale('ko');

const colors = {
  primary: '#ffb4a8',
  ulsanBlue: '#004A9F',
  attending: '#22c55e',
  notAttending: '#ef4444',
  tv: '#8b5cf6',
};

interface BoardItemWithUrl extends BoardListItem {
  thumbnailUrl?: string;
}

interface CalendarContentProps {
  items: BoardItemWithUrl[];
  loading: boolean;
  onItemClick: (boardId: number) => void;
  onDateSelect?: (date: string | null) => void;
  refreshKey?: number;
}

type ViewMode = 'month' | 'week';

const CalendarContent: React.FC<CalendarContentProps> = ({
  items,
  loading,
  onItemClick,
  onDateSelect,
  refreshKey,
}) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDto[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredMatchId, setHoveredMatchId] = useState<number | null>(null);
  const [attendanceUpdating, setAttendanceUpdating] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const startHeight = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [measuredWeekHeight, setMeasuredWeekHeight] = useState(52);

  const calendarWeeks = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = endOfMonth.date();

    const days: (dayjs.Dayjs | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(currentMonth.date(i));
    while (days.length % 7 !== 0) days.push(null);

    const weeks: (dayjs.Dayjs | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentMonth]);

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
    requestAnimationFrame(measureGrid);
    const observer = new ResizeObserver(measureGrid);
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [calendarWeeks.length, measuredWeekHeight]);

  const weekHeight = measuredWeekHeight;
  const monthHeight = calendarWeeks.length * weekHeight;

  useEffect(() => {
    if (calendarHeight === null) {
      setCalendarHeight(viewMode === 'month' ? monthHeight : weekHeight);
    }
  }, [calendarHeight, viewMode, monthHeight, weekHeight]);

  useEffect(() => {
    if (viewMode === 'month' && !isDragging) {
      setCalendarHeight(monthHeight);
    }
  }, [monthHeight, viewMode, isDragging]);

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
  }, [isDragging, monthHeight, weekHeight]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = (monthHeight + weekHeight) / 2;
    if ((calendarHeight ?? monthHeight) < threshold) {
      setCalendarHeight(weekHeight);
      setViewMode('week');
      const targetDate = selectedDate ? dayjs(selectedDate) : dayjs();
      const weekIdx = calendarWeeks.findIndex(week =>
        week.some(day => day && day.isSame(targetDate, 'day'))
      );
      if (weekIdx >= 0) setActiveWeekIndex(weekIdx);
    } else {
      setCalendarHeight(monthHeight);
      setViewMode('month');
      setSelectedDate(null);
      onDateSelect?.(null);
    }
  }, [isDragging, calendarHeight, monthHeight, weekHeight, onDateSelect, selectedDate, calendarWeeks]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => handleDragStart(e.touches[0].clientY), [handleDragStart]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => handleDragMove(e.touches[0].clientY), [handleDragMove]);
  const handleTouchEnd = useCallback(() => handleDragEnd(), [handleDragEnd]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); handleDragStart(e.clientY); }, [handleDragStart]);

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

  const goToNextWeek = useCallback(() => {
    setSelectedDate(null);
    onDateSelect?.(null);
    if (activeWeekIndex < calendarWeeks.length - 1) {
      setActiveWeekIndex(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev.add(1, 'month'));
      setActiveWeekIndex(0);
    }
  }, [activeWeekIndex, calendarWeeks.length, onDateSelect]);

  const goToPrevWeek = useCallback(() => {
    setSelectedDate(null);
    onDateSelect?.(null);
    if (activeWeekIndex > 0) {
      setActiveWeekIndex(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev.subtract(1, 'month'));
      setActiveWeekIndex(999);
    }
  }, [activeWeekIndex, onDateSelect]);

  const goToPrevMonth = () => { setSelectedDate(null); onDateSelect?.(null); setCurrentMonth(prev => prev.subtract(1, 'month')); };
  const goToNextMonth = () => { setSelectedDate(null); onDateSelect?.(null); setCurrentMonth(prev => prev.add(1, 'month')); };

  const horizontalSwipe = useSwipeGesture({
    onSwipeLeft: () => viewMode === 'week' ? goToNextWeek() : goToNextMonth(),
    onSwipeRight: () => viewMode === 'week' ? goToPrevWeek() : goToPrevMonth(),
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
            ? { ...event, attendanceStatus: status, attendances: event.attendances?.map((person, i) => i === 0 ? { ...person, status } : person) }
            : event
        )
      );
    } catch { /* 참석 상태 업데이트 실패 */ }
    finally { setAttendanceUpdating(false); setHoveredMatchId(null); }
  };

  const handleMatchMouseEnter = (matchId: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredMatchId(matchId);
  };
  const handleMatchMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredMatchId(null), 200);
  };

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      setEventsLoading(true);
      setCalendarEvents([]);
      try {
        const start = currentMonth.startOf('month').format('YYYY-MM-DDTHH:mm:ss');
        const end = currentMonth.endOf('month').format('YYYY-MM-DDTHH:mm:ss');
        const response = await matchApi.getCalendar(start, end);
        setCalendarEvents(response.events);
      } catch { setCalendarEvents([]); }
      finally { setEventsLoading(false); }
    };
    fetchCalendarEvents();
  }, [currentMonth, refreshKey]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>();
    calendarEvents.forEach(event => {
      const startDate = dayjs(event.startDate);
      const endDate = event.endDate ? dayjs(event.endDate) : startDate;
      let current = startDate;
      while (current.isBefore(endDate, 'day') || current.isSame(endDate, 'day')) {
        const dateKey = current.format('YYYY-MM-DD');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(event);
        current = current.add(1, 'day');
      }
    });
    return map;
  }, [calendarEvents]);

  useEffect(() => {
    if (viewMode === 'week') return;
    const today = dayjs();
    const targetDate = selectedDate ? dayjs(selectedDate) : today;
    if (targetDate.month() === currentMonth.month() && targetDate.year() === currentMonth.year()) {
      const weekIdx = calendarWeeks.findIndex(week => week.some(day => day && day.isSame(targetDate, 'day')));
      if (weekIdx >= 0) setActiveWeekIndex(weekIdx);
    } else {
      setActiveWeekIndex(0);
    }
  }, [selectedDate, currentMonth, calendarWeeks, viewMode]);

  useEffect(() => {
    if (activeWeekIndex >= calendarWeeks.length) setActiveWeekIndex(Math.max(0, calendarWeeks.length - 1));
  }, [calendarWeeks.length, activeWeekIndex]);

  const handleDateClick = (dateKey: string) => {
    const newSelected = selectedDate === dateKey ? null : dateKey;
    setSelectedDate(newSelected);
    onDateSelect?.(newSelected);
  };

  const formatEventDateRange = (startDateStr: string, endDateStr?: string): string => {
    const startDate = dayjs(startDateStr);
    const endDate = endDateStr ? dayjs(endDateStr) : null;
    if (!endDate || startDate.isSame(endDate, 'day')) return startDate.format('M월 D일 (ddd)');
    if (startDate.isSame(endDate, 'month')) return `${startDate.format('M월 D')}-${endDate.format('D일 (ddd)')}`;
    return `${startDate.format('M월 D일')} - ${endDate.format('M월 D일 (ddd)')}`;
  };

  const today = dayjs();

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

  const weekEvents = useMemo(() => {
    const currentWeek = calendarWeeks[activeWeekIndex];
    if (!currentWeek) return [];
    const weekDays = currentWeek.filter((day): day is dayjs.Dayjs => day !== null);
    if (weekDays.length === 0) return [];
    const weekStart = weekDays[0];
    const weekEnd = weekDays[weekDays.length - 1];
    return calendarEvents
      .filter(e => {
        const eventStart = dayjs(e.startDate);
        const eventEnd = e.endDate ? dayjs(e.endDate) : eventStart;
        return (eventStart.isBefore(weekEnd, 'day') || eventStart.isSame(weekEnd, 'day')) &&
               (eventEnd.isAfter(weekStart, 'day') || eventEnd.isSame(weekStart, 'day'));
      })
      .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));
  }, [calendarEvents, calendarWeeks, activeWeekIndex]);

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

  const getStatusColor = (status?: MatchAttendanceStatus) => {
    if (status === 'ATTENDING') return colors.attending;
    if (status === 'NOT_ATTENDING') return colors.notAttending;
    if (status === 'TV') return colors.tv;
    return colors.ulsanBlue;
  };

  const renderDayCell = (day: dayjs.Dayjs | null, index: number) => {
    if (!day) return <div key={`empty-${index}`} style={{ aspectRatio: '1' }} />;

    const dateKey = day.format('YYYY-MM-DD');
    const dayEvents = eventsByDate.get(dateKey) || [];
    const hasBoard = dayEvents.some(e => e.type === 'BOARD');
    const matchEvent = dayEvents.find(e => e.type === 'MATCH');
    const hasMatch = !!matchEvent;
    const anyoneAttending = matchEvent?.attendances?.some(a => a.status === 'ATTENDING');
    const isToday = day.isSame(today, 'day');
    const dayOfWeek = day.day();
    const isSelected = selectedDate === dateKey;

    let bgStyle: React.CSSProperties = {};
    if (hasBoard && hasMatch) {
      bgStyle.background = anyoneAttending
        ? `linear-gradient(135deg, ${colors.primary}20, ${colors.attending}20)`
        : `linear-gradient(135deg, ${colors.primary}20, ${colors.ulsanBlue}20)`;
    } else if (hasBoard) {
      bgStyle.backgroundColor = `${colors.primary}15`;
    } else if (hasMatch) {
      bgStyle.backgroundColor = anyoneAttending ? `${colors.attending}15` : `${colors.ulsanBlue}15`;
    }

    const cellClasses = [
      'calendar-day-cell',
      isSelected && 'calendar-day-cell--selected',
      isToday && !isSelected && 'calendar-day-cell--today',
    ].filter(Boolean).join(' ');

    const numberClasses = [
      'calendar-day-number',
      (isToday || hasBoard || hasMatch) && 'calendar-day-number--bold',
      dayOfWeek === 0 && 'calendar-day-number--sun',
      dayOfWeek === 6 && 'calendar-day-number--sat',
    ].filter(Boolean).join(' ');

    return (
      <div key={dateKey} onClick={() => handleDateClick(dateKey)} className={cellClasses} style={bgStyle}>
        <span className={numberClasses}>{day.date()}</span>
        <div className="calendar-day-dots">
          {hasBoard && <div className="calendar-day-dot bg-primary" />}
          {hasMatch && matchEvent?.attendances?.map((person, i) => (
            <div key={i} className="calendar-day-dot" style={{ backgroundColor: getStatusColor(person.status) }} />
          ))}
        </div>
      </div>
    );
  };

  const renderEventCard = (event: CalendarEventDto, idx: number) => {
    if (event.type === 'BOARD') {
      const item = items.find(i => i.id === event.boardId);
      return (
        <div key={`board-${event.boardId}-${idx}`} onClick={() => event.boardId && onItemClick(event.boardId)} className="calendar-event-card calendar-event-card--board">
          {item?.thumbnailUrl ? (
            <div className="calendar-event-thumbnail" style={{ backgroundImage: `url("${item.thumbnailUrl}")` }} />
          ) : (
            <div className="calendar-event-thumbnail calendar-event-thumbnail--empty" style={{ backgroundColor: `${colors.primary}20` }}>
              <span className="calendar-event-thumbnail-icon color-primary">favorite</span>
            </div>
          )}
          <div className="calendar-event-content">
            <p className="calendar-event-title">{event.title}</p>
            <p className="calendar-event-date">{formatEventDateRange(event.startDate, event.endDate)}</p>
          </div>
          <span className="calendar-event-arrow">chevron_right</span>
        </div>
      );
    }

    const myStatus = event.attendanceStatus || event.attendances?.[0]?.status || undefined;
    const isHovered = hoveredMatchId === event.matchId;
    const statusColor = getStatusColor(myStatus);
    const statusLabel = myStatus === 'ATTENDING' ? '직관' : myStatus === 'NOT_ATTENDING' ? '불참' : myStatus === 'TV' ? 'TV' : undefined;
    const statusIcon = myStatus === 'ATTENDING' ? 'stadium' : myStatus === 'NOT_ATTENDING' ? 'cancel' : myStatus === 'TV' ? 'tv' : undefined;

    return (
      <div
        key={`match-${event.matchId}-${idx}`}
        onMouseEnter={() => event.matchId && handleMatchMouseEnter(event.matchId)}
        onMouseLeave={handleMatchMouseLeave}
        className="calendar-event-card calendar-event-card--match"
        style={{ borderLeftColor: statusColor }}
      >
        <div className="calendar-event-thumbnail calendar-event-thumbnail--empty" style={{ backgroundColor: `${statusColor}15` }}>
          <span className="calendar-event-thumbnail-icon" style={{ color: statusColor }}>sports_soccer</span>
        </div>
        <div className="calendar-event-content">
          <p className="calendar-event-title">{event.title}</p>
          <p className="calendar-event-date">{dayjs(event.startDate).format('M월 D일 (ddd) HH:mm')}</p>
          {event.attendances && event.attendances.length > 0 && (
            <p className="calendar-event-attendances">
              {event.attendances.map((person, i) => {
                const label = person.status === 'ATTENDING' ? '직관' : person.status === 'NOT_ATTENDING' ? '불참' : person.status === 'TV' ? 'TV' : '미정';
                const color = getStatusColor(person.status);
                return (
                  <span key={i} className="calendar-event-attendance-item">
                    {i > 0 && <span className="calendar-event-attendance-separator">/</span>}
                    <span className="calendar-event-attendance-name">{person.name}</span>
                    <span className="calendar-event-attendance-status" style={{ color }}>{label}</span>
                  </span>
                );
              })}
            </p>
          )}
        </div>
        {statusLabel && !isHovered && (
          <div className="calendar-status-badge" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
            <span className="calendar-status-badge-icon">{statusIcon}</span>
            {statusLabel}
          </div>
        )}
        {isHovered && event.matchId && (
          <div className="calendar-attendance-popup" onMouseEnter={() => event.matchId && handleMatchMouseEnter(event.matchId)} onMouseLeave={handleMatchMouseLeave}>
            {(['ATTENDING', 'NOT_ATTENDING', 'TV'] as const).map(status => {
              const btnColor = getStatusColor(status);
              const btnLabel = status === 'ATTENDING' ? '참석' : status === 'NOT_ATTENDING' ? '불참' : 'TV';
              const btnIcon = status === 'ATTENDING' ? 'check_circle' : status === 'NOT_ATTENDING' ? 'cancel' : 'tv';
              return (
                <button
                  key={status}
                  onClick={(e) => { e.stopPropagation(); handleAttendanceChange(event.matchId!, status); }}
                  disabled={attendanceUpdating}
                  className="calendar-attendance-btn"
                  style={{ backgroundColor: myStatus === status ? `${btnColor}20` : 'transparent' }}
                >
                  <span className="calendar-attendance-btn-icon" style={{ color: btnColor }}>{btnIcon}</span>
                  <span className="calendar-attendance-btn-label" style={{ color: btnColor }}>{btnLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const legendItems = [
    { color: colors.primary, label: '데이트' },
    { color: colors.ulsanBlue, label: '경기' },
    { color: colors.attending, label: '직관' },
    { color: colors.notAttending, label: '불참' },
    { color: colors.tv, label: 'TV' },
  ];

  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="calendar">
      {/* Legend */}
      <div className="calendar-legend">
        {legendItems.map(({ color, label }) => (
          <div key={label} className="calendar-legend-item">
            <div className="calendar-legend-dot" style={{ backgroundColor: color }} />
            <span className="calendar-legend-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="calendar-nav">
        <button onClick={goToPrevMonth} className="calendar-nav-btn">
          <span className="calendar-nav-btn-icon">chevron_left</span>
        </button>
        <h2 className="calendar-month-title">{currentMonth.format('YYYY년 M월')}</h2>
        <button onClick={goToNextMonth} className="calendar-nav-btn">
          <span className="calendar-nav-btn-icon">chevron_right</span>
        </button>
      </div>

      {/* Day Headers */}
      <div className="calendar-day-headers">
        {dayHeaders.map((day, idx) => (
          <div key={day} className={`calendar-day-header ${idx === 0 ? 'calendar-day-header--sun' : idx === 6 ? 'calendar-day-header--sat' : 'calendar-day-header--weekday'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {(loading || eventsLoading) ? (
        <div className="calendar-loading">
          <span className="calendar-loading-icon">progress_activity</span>
        </div>
      ) : (
        <div className="calendar-grid-wrapper">
          <div className={`calendar-grid-container ${!isDragging ? 'calendar-grid-container--animating' : ''}`} style={{ height: (calendarHeight ?? monthHeight) + 16 }}>
            {viewMode === 'month' ? (
              <div ref={gridRef} {...horizontalSwipe} className="calendar-grid calendar-grid--month">
                {calendarWeeks.flat().map((day, index) => renderDayCell(day, index))}
              </div>
            ) : (
              <div {...horizontalSwipe} className="calendar-grid">
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
            className={`calendar-drag-handle ${isDragging ? 'calendar-drag-handle--grabbing' : 'calendar-drag-handle--grab'}`}
          >
            <div className={`calendar-drag-bar ${isDragging ? 'calendar-drag-bar--active' : ''}`} />
          </div>
        </div>
      )}

      {/* Week View: Events Panel */}
      {viewMode === 'week' && (
        <div className="calendar-events-panel calendar-events-panel--animated">
          <div className="calendar-events-header">
            <h3 className="calendar-events-title">
              <span className="icon">event</span>
              {selectedDate
                ? dayjs(selectedDate).format('M월 D일 (ddd)') + ' 일정'
                : (() => {
                    const week = calendarWeeks[activeWeekIndex];
                    const firstDay = week?.find(d => d !== null);
                    const lastDay = [...(week || [])].reverse().find(d => d !== null);
                    return firstDay && lastDay ? `${firstDay.format('M/D')} - ${lastDay.format('M/D')} 일정` : '이번 주 일정';
                  })()}
            </h3>
            {selectedDate && (
              <button onClick={() => { setSelectedDate(null); onDateSelect?.(null); }} className="calendar-events-clear-btn">
                전체 보기
                <span className="icon">close</span>
              </button>
            )}
          </div>
          {(selectedDate ? selectedDayEvents : weekEvents).length === 0 ? (
            <p className="calendar-events-empty">{selectedDate ? '이 날 일정이 없습니다' : '이번 주 일정이 없습니다'}</p>
          ) : (
            (selectedDate ? selectedDayEvents : weekEvents).map((event, idx) => renderEventCard(event, idx))
          )}
        </div>
      )}

      {/* Month View: Events List */}
      {viewMode === 'month' && !loading && !eventsLoading && (
        <div className="calendar-events-panel">
          <div className="calendar-events-header">
            <h3 className="calendar-events-title">
              <span className="icon">calendar_month</span>
              {selectedDate ? dayjs(selectedDate).format('M월 D일 (ddd)') + ' 일정' : currentMonth.format('M월') + ' 일정'}
            </h3>
            {selectedDate && (
              <button onClick={() => { setSelectedDate(null); onDateSelect?.(null); }} className="calendar-events-clear-btn">
                전체 보기
                <span className="icon">close</span>
              </button>
            )}
          </div>
          {sortedEvents.length === 0 ? (
            <p className="calendar-events-empty">이번 달 일정이 없습니다</p>
          ) : (
            sortedEvents.map((event, idx) => renderEventCard(event, idx))
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarContent;

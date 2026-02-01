const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/matches`;

// 관람 상태
export type MatchAttendanceStatus = 'ATTENDING' | 'NOT_ATTENDING' | 'UNSURE';

// 캘린더 이벤트 타입
export type CalendarEventType = 'MATCH' | 'BOARD';

// 캘린더 이벤트
export interface CalendarEventDto {
  date: string;                    // ISO DateTime
  type: CalendarEventType;
  matchId?: number;
  boardId?: number;
  title: string;
  attendanceStatus?: MatchAttendanceStatus;  // 프론트 상태 관리용
  attendances?: PersonAttendanceDto[];
}

export interface PersonAttendanceDto {
  userId: number;
  name: string;
  status: MatchAttendanceStatus | null;
}

// 캘린더 응답
export interface CalendarResponseDto {
  events: CalendarEventDto[];
}

// 경기 관람 여부 요청
export interface MatchAttendanceRequestDto {
  status: MatchAttendanceStatus;
}

// 경기 관람 여부 응답
export interface MatchAttendanceResponseDto {
  matchId: number;
  userId: number;
  status: MatchAttendanceStatus;
}

// 경기 상세 (관람 여부 포함)
export interface MatchWithAttendanceDto {
  matchId: number;
  awayTeam: string;
  stadium: string;
  homeTeam: string;
  kickoffTime: string;             // ISO DateTime
  isAttending: MatchAttendanceStatus;
}

// 특정 날짜 경기 조회 응답
export interface MatchByDateResponseDto {
  date: string;
  match?: MatchWithAttendanceDto;
}

export const matchApi = {
  // 캘린더 조회 (start ~ end 기간)
  async getCalendar(start: string, end: string): Promise<CalendarResponseDto> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_BASE_URL}/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch calendar');
    }

    return response.json();
  },

  // 경기 관람 여부 설정
  async updateAttendance(
    matchId: number,
    status: MatchAttendanceStatus
  ): Promise<MatchAttendanceResponseDto> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/${matchId}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error('Failed to update attendance');
    }

    return response.json();
  },

  // 특정 날짜 경기 조회
  async getMatchByDate(date: string): Promise<MatchByDateResponseDto> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_BASE_URL}/date?date=${encodeURIComponent(date)}`,
      {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch match by date');
    }

    return response.json();
  }
};

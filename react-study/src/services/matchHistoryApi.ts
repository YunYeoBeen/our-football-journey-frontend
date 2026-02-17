import { authFetch } from './authFetch';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/match-history`;

// ─── Types ───

export type PlaceType = 'STADIUM' | 'RESTAURANT' | 'CAFE' | 'BAR' | 'ETC';

export interface PlaceCreateDto {
  placeId: number;
  address?: string;
  latitude: number;
  longitude: number;
  placeType: PlaceType;
}

export interface PlaceResponseDto {
  id: number;
  address?: string;
  latitude: number;
  longitude: number;
  placeType: PlaceType;
}

export interface MatchHistoryCreateRequest {
  matchId: number;
  homeScore: number;
  awayScore: number;
  memo?: string;
  places: PlaceCreateDto[];
}

export interface MatchHistoryUpdateRequest {
  id: number;
  matchId?: number;
  homeScore?: number;
  awayScore?: number;
  memo?: string;
  places: PlaceCreateDto[];
}

export interface MatchInfoDto {
  id: number;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  kickOffTime: string;
}

export interface MatchHistoryResponseDto {
  id: number;
  matchId?: number;
  matchInfo?: MatchInfoDto;
  homeScore?: number;
  awayScore?: number;
  memo?: string;
  places?: PlaceResponseDto[];
  writer: string;
  createdAt: string;
}

export interface MatchHistoryCUDResponse {
  matchHistoryId: number | null;
  success: boolean;
}

export interface SliceResponse<T> {
  content: T[];
  last: boolean;
  number: number;
  size: number;
}

export interface MapPlaceDto {
  placeId: number;
  matchHistoryId: number;
  address?: string;
  latitude: number;
  longitude: number;
  placeType: PlaceType;
  memo?: string;
  matchDate?: string;
  opponent?: string;
}

// ─── API ───

export const matchHistoryApi = {
  async create(data: MatchHistoryCreateRequest): Promise<MatchHistoryCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('직관 기록 생성에 실패했습니다.');
    return response.json();
  },

  async update(data: MatchHistoryUpdateRequest): Promise<MatchHistoryCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('직관 기록 수정에 실패했습니다.');
    return response.json();
  },

  async delete(id: number): Promise<MatchHistoryCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/delete/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('직관 기록 삭제에 실패했습니다.');
    return response.json();
  },

  async getDetail(id: number): Promise<MatchHistoryResponseDto> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/detail/${id}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('직관 기록 조회에 실패했습니다.');
    return response.json();
  },

  async getByMatchId(matchId: number): Promise<MatchHistoryResponseDto | null> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/by-match/${matchId}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('직관 기록 조회에 실패했습니다.');
    const data = await response.json();
    return data || null;
  },

  async getAll(page = 0, size = 20): Promise<SliceResponse<MatchHistoryResponseDto>> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/all-list?page=${page}&size=${size}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('직관 기록 목록 조회에 실패했습니다.');
    return response.json();
  },

  async getAllPlaces(): Promise<MapPlaceDto[]> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/places/all`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('장소 목록 조회에 실패했습니다.');
    return response.json();
  },
};

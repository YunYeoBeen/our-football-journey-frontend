import { CategoryMap, WeatherMap } from '../types';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/board`;

export interface BoardCreateRequest {
  startDate: string;
  endDate: string;
  title: string;
  place: string;
  category: string;
  content: string;
  imageKeys: string[];  // S3 이미지 키 배열
  weather: string;
}

export interface BoardResponse {
  id?: number;
  startDate: string;
  endDate?: string;
  title: string;
  place: string;
  category: string;
  content: string;
  imageUrl: string;  // 썸네일 URL (단일 문자열)
  weather: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardListItem {
  id: number;
  title: string;
  thumbnail: string | null;  // S3 key (presigned URL 발급 필요)
  startDate: string;
  endDate?: string;
  place?: string;
  category?: string;
  content?: string;
  imageUrl?: string;
  weather?: string;
  writer?: string;
}

export interface BoardListResponse {
  content: BoardListItem[];
  hasNext: boolean;
}

export interface BoardSearchParams {
  keyword?: string;
  category?: string;
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  page?: number;
  size?: number;
}

// 댓글 응답 (상세 조회용)
export interface CommentResponse {
  commentId: number;
  userName: string;
  content: string;
  createdAt: string;
  childCount: number;  // 대댓글 수
}

// 게시물 상세 조회 응답
export interface BoardDetailResponse {
  id: number;
  startDate: string;
  endDate?: string;
  title: string;
  place: string;
  category: string;
  content: string;
  images: string[];  // 상세 조회 시 이미지 key 배열
  weather: string;
  writer?: string;
  createdAt?: string;
  updatedAt?: string;
  commentList?: CommentResponse[];  // 댓글 목록
}

// 게시물 수정 요청
export interface BoardUpdateRequest {
  title?: string;
  startDate?: string;
  endDate?: string;
  content?: string;
  weather?: string;
  place?: string;
  category?: string;
  keepImageKeys?: string[];
  addImageFileNames?: string[];
  deleteImageKeys?: string[];
}

// 게시물 수정/삭제 응답
export interface BoardMutationResponse {
  id: number;
  success: boolean;
}

// 서버 응답을 클라이언트 형식으로 변환
const convertToClientFormat = (response: BoardResponse): BoardResponse => ({
  ...response,
  category: CategoryMap.toClient[response.category] || response.category,
  weather: WeatherMap.toClient[response.weather] || response.weather
});

export const boardApi = {
  // 게시물 생성
  async create(data: BoardCreateRequest): Promise<BoardResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`게시물 생성 실패: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return convertToClientFormat(result);
  },

  // 전체 게시물 조회
  async getAllList(page: number = 0, size: number = 10): Promise<BoardListResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/all-list?page=${page}&size=${size}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('게시물 조회에 실패했습니다.');
    }

    const data = await response.json();
    return {
      content: data.content,
      hasNext: !data.last,  // Spring Slice의 last를 hasNext로 변환
    };
  },

  // 게시물 상세 조회
  async getDetail(boardId: number): Promise<BoardDetailResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/detail/${boardId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('게시물 상세 조회에 실패했습니다.');
    }

    const result = await response.json();
    return {
      ...result,
      category: CategoryMap.toClient[result.category] || result.category,
      weather: WeatherMap.toClient[result.weather] || result.weather
    };
  },

  // 게시물 수정
  async update(boardId: number, data: BoardUpdateRequest): Promise<BoardMutationResponse> {
    const token = localStorage.getItem('accessToken');

    // category와 weather를 서버 형식으로 변환
    const serverData = {
      ...data,
      category: data.category ? (CategoryMap.toServer[data.category] || data.category) : undefined,
      weather: data.weather ? (WeatherMap.toServer[data.weather] || data.weather) : undefined
    };

    const response = await fetch(`${API_BASE_URL}/${boardId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(serverData)
    });

    if (!response.ok) {
      throw new Error('게시물 수정에 실패했습니다.');
    }

    return response.json();
  },

  // 게시물 삭제
  async delete(boardId: number): Promise<BoardMutationResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/${boardId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('게시물 삭제에 실패했습니다.');
    }

    return response.json();
  },

  // 게시물 검색
  async search(params: BoardSearchParams): Promise<BoardListResponse> {
    const token = localStorage.getItem('accessToken');
    const queryParams = new URLSearchParams();

    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.category) queryParams.append('category', params.category);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    queryParams.append('page', String(params.page ?? 0));
    queryParams.append('size', String(params.size ?? 10));

    const response = await fetch(`${API_BASE_URL}/search?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('검색에 실패했습니다.');
    }

    const data = await response.json();
    return {
      content: data.content,
      hasNext: !data.last,  // Spring Slice의 last를 hasNext로 변환
    };
  }
};

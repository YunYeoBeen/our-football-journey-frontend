const API_BASE_URL = 'http://localhost:8080/api/v1/board';

export interface BoardCreateRequest {
  date: string;
  title: string;
  place: string;
  category: string;
  mood: number;
  content: string;
  imageUrl: string[];
  weather: string;
}

export interface BoardResponse {
  id: number;
  date: string;
  title: string;
  place: string;
  category: string;
  mood: number;
  content: string;
  imageUrl: string[];
  weather: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardListResponse {
  content: BoardResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

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
      throw new Error('게시물 생성에 실패했습니다.');
    }

    return response.json();
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

    return response.json();
  }
};

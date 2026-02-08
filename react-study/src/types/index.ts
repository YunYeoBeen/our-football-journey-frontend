export interface User {
  name: string;
  email: string;
}

export interface Memory {
  id: number;
  startDate: string;
  endDate?: string;
  title: string;
  location: string;
  place?: string; // 서버 API와의 호환성
  category: '데이트' | '여행' | '맛집' | '축구' | '일상';
  content: string;
  images: string[];
  imageUrl?: string[]; // 서버 API와의 호환성
  weather: '맑음' | '흐림' | '비' | '눈';
}

// 서버 ENUM 매핑
export const CategoryMap = {
  toServer: {
    '데이트': 'DATE',
    '여행': 'TRAVEL',
    '맛집': 'FOOD',
    '축구': 'FOOTBALL',
    '일상': 'DAILY'
  } as Record<string, string>,
  toClient: {
    'DATE': '데이트',
    'TRAVEL': '여행',
    'FOOD': '맛집',
    'FOOTBALL': '축구',
    'DAILY': '일상'
  } as Record<string, string>
};

export const WeatherMap = {
  toServer: {
    '맑음': 'SUNNY',
    '흐림': 'CLOUDY',
    '비': 'RAINY',
    '눈': 'SNOW'
  } as Record<string, string>,
  toClient: {
    'SUNNY': '맑음',
    'CLOUDY': '흐림',
    'RAINY': '비',
    'SNOW': '눈',
    'ETC': '맑음'
  } as Record<string, string>
};

// 댓글 관련 타입
export interface CommentResponseDto {
  commentId: number;
  userName: string;
  content: string;
  createdAt: string;
  childCount?: number;
}

// 댓글 생성 요청 (parentId 있으면 대댓글, 없으면 부모 댓글)
export interface CommentCreateRequest {
  boardId: number;
  parentId?: number;
  content: string;
  userName: string;
}

export interface CommentUpdateRequest {
  content: string;
}

export interface ChildCommentsSliceResponse {
  content: CommentResponseDto[];
  last: boolean;  // Spring Slice는 hasNext 대신 last 반환
  number: number;
  size: number;
}

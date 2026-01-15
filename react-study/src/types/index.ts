export interface User {
  name: string;
  email: string;
}

export interface Memory {
  id: number;
  date: string;
  title: string;
  location: string;
  place?: string; // 서버 API와의 호환성
  category: '데이트' | '기념일' | '여행' | '일상';
  content: string;
  images: string[];
  imageUrl?: string[]; // 서버 API와의 호환성
  mood: number;
  weather: '맑음' | '흐림' | '비' | '눈';
}


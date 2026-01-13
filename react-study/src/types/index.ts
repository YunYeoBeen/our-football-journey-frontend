export interface User {
  name: string;
  email: string;
}

export interface Memory {
  id: number;
  date: string;
  title: string;
  location: string;
  category: '데이트' | '기념일' | '여행' | '일상';
  content: string;
  images: string[];
  mood: number;
  weather: '맑음' | '흐림' | '비' | '눈';
  duration: string;
}


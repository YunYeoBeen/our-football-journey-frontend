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

// 서버 ENUM 매핑
export const CategoryMap = {
  toServer: {
    '데이트': 'DATE',
    '기념일': 'DATE',  // 서버에 ANNIVERSARY가 없으면 DATE로 매핑
    '여행': 'TRAVEL',
    '일상': 'FOOD'     // 서버에 DAILY가 없으면 FOOD로 매핑
  } as Record<string, string>,
  toClient: {
    'DATE': '데이트',
    'TRAVEL': '여행',
    'FOOD': '일상',
    'FOOTBALL': '일상'
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


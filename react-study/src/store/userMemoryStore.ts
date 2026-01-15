import { create } from 'zustand';
import type { Memory } from '../types';

interface MemoryState {
  memories: Memory[];
  addMemory: (memory: Memory) => void;
  deleteMemory: (id: number) => void;
  setMemories: (memories: Memory[]) => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [
    {
      id: 1,
      date: '2024-12-25',
      title: '크리스마스 데이트',
      location: '강남 CGV',
      category: '데이트',
      content: '영화 보고 맛있는 저녁 먹었어요! 너무 행복한 하루였어 💕',
      images: ['https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400'],
      mood: 5,
      weather: '맑음'
    },
    {
      id: 2,
      date: '2024-12-14',
      title: '100일 기념일',
      location: '한강공원',
      category: '기념일',
      content: '우리의 소중한 100일! 한강에서 치킨 먹고 야경 보면서 이야기 나눴어요 ❤️',
      images: ['https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400'],
      mood: 5,
      weather: '흐림'
    },
    {
      id: 3,
      date: '2024-11-20',
      title: '카페 데이트',
      location: '성수동 카페거리',
      category: '데이트',
      content: '예쁜 카페 찾아서 브런치 먹었어! 사진도 많이 찍고 좋았다 😊',
      images: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400'],
      mood: 4,
      weather: '맑음'
    }
  ],
  
  addMemory: (memory) => set((state) => ({
    memories: [memory, ...state.memories]
  })),

  deleteMemory: (id) => set((state) => ({
    memories: state.memories.filter(m => m.id !== id)
  })),

  setMemories: (memories) => set({ memories })
}));
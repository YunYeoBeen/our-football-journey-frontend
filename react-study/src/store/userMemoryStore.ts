import { create } from 'zustand';
import type { Memory } from '../types';

interface MemoryState {
  memories: Memory[];
  addMemory: (memory: Memory) => void;
  deleteMemory: (id: number) => void;
  setMemories: (memories: Memory[]) => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [],
  
  addMemory: (memory) => set((state) => ({
    memories: [memory, ...state.memories]
  })),

  deleteMemory: (id) => set((state) => ({
    memories: state.memories.filter(m => m.id !== id)
  })),

  setMemories: (memories) => set({ memories })
}));
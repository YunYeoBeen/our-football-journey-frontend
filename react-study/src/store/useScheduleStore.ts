import { create } from 'zustand';
import type { Schedules, ScheduleItem } from '../types';

interface ScheduleState {
  schedules: Schedules;
  addSchedule: (date: string, content: string) => void;
  deleteSchedule: (date: string, index: number) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  schedules: {
    '2024-12-31': [{ type: 'success', content: '가족 송년회 🎉' }],
    '2025-01-01': [{ type: 'warning', content: '새해 첫날 모임' }],
    '2025-01-15': [{ type: 'error', content: '할머니 생신' }]
  },
  addSchedule: (date, content) => set((state) => ({
    schedules: {
      ...state.schedules,
      [date]: [
        ...(state.schedules[date] || []),
        { type: 'success', content }
      ]
    }
  })),
  deleteSchedule: (date, index) => set((state) => ({
    schedules: {
      ...state.schedules,
      [date]: state.schedules[date].filter((_, i) => i !== index)
    }
  })),
}));
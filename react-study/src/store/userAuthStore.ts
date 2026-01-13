import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  
  login: (token: string, userData: User) => {
    localStorage.setItem('accessToken', token);
    set({ user: userData });
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    set({ user: null });
  },
}));
import { create } from 'zustand'

interface AuthState {
  isLogin: boolean
  login: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLogin: false,
  login: () => set({ isLogin: true }),
  logout: () => set({ isLogin: false }),
}))

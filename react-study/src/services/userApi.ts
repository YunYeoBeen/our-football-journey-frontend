import { authFetch } from './authFetch';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/user`;

export interface UserProfileImageResponse {
  id: number;
  success: boolean;
  imageKey: string;
}

export interface UserProfileResponse {
  id: number;
  success: boolean;
  imageKey: string | null;
}

export const userApi = {
  // 프로필 이미지 변경
  async updateProfileImage(imageKey: string): Promise<UserProfileImageResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ imageKey })
    });

    if (!response.ok) {
      throw new Error('프로필 이미지 변경에 실패했습니다.');
    }

    return response.json();
  },

  // 내 프로필 조회
  async getMyProfile(): Promise<UserProfileResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('프로필 조회에 실패했습니다.');
    }

    return response.json();
  },

  // Firebase 토큰 업데이트
  async updateFirebaseToken(firebaseToken: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/firebase-token`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ firebaseToken })
    });

    if (!response.ok) {
      throw new Error('Firebase 토큰 업데이트에 실패했습니다.');
    }
  }
};

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
    const response = await fetch(`${API_BASE_URL}/profile`, {
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
    const response = await fetch(`${API_BASE_URL}/me`, {
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
  }
};

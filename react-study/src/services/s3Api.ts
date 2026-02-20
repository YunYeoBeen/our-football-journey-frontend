import { authFetch } from './authFetch';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/s3`;

// 업로드용 Presigned URL 응답
export interface PresignedUploadResponse {
  uploadUrl: string;  // PUT 용 URL
  key: string;        // S3 key (DB 저장용)
}

export type UploadType = 'BOARD' | 'PROFILE';

export const s3Api = {
  // 업로드용 Presigned URL 발급
  async getPresignedUploadUrls(fileNames: string[], type: UploadType = 'BOARD'): Promise<PresignedUploadResponse[]> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/presigned/upload/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ fileNames })
    });

    if (!response.ok) {
      throw new Error('Failed to get presigned upload URLs');
    }

    return response.json();
  },

  // Presigned URL로 파일 업로드
  async uploadToS3(uploadUrl: string, file: File | Blob): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to S3');
    }
  },

  async getPresignedViewUrls(keys: string[], type: UploadType = 'BOARD'): Promise<string[]> {
    return Promise.all(keys.map(key => this.getPresignedViewUrl(key, type)));
  },

  async getPresignedViewUrl(key: string, type: UploadType = 'BOARD'): Promise<string> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/presigned/view/${type}?key=${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get presigned view URL');
    }

    const data = await response.json();
    return data.url;
  },

  // 메인 페이지 이미지 조회 (인증 불필요)
  async getMainImages(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/main-images`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to get main images');
    }

    const data: { key: string; url: string }[] = await response.json();
    return data.map(item => item.url);
  }
};

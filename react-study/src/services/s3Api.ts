const API_BASE_URL = 'http://localhost:8080/api/v1/s3';

export interface PresignedUrlResponse {
  uploadUrl: string;  // PUT 용 URL
  finalUrl: string;   // DB 저장 & 조회용 URL
}

export const s3Api = {
  // Presigned URL 발급
  async getPresignedUrls(fileNames: string[]): Promise<PresignedUrlResponse[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_BASE_URL}/presigned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ files: fileNames })
    });

    if (!response.ok) {
      throw new Error('Failed to get presigned URLs');
    }

    return response.json();
  },

  // Presigned URL로 파일 업로드
  async uploadToS3(uploadUrl: string, file: File): Promise<void> {
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
  }
};

import type {
  CommentCreateRequest,
  CommentUpdateRequest,
  ChildCommentsSliceResponse,
} from '../types';
import { authFetch } from './authFetch';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/comments`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export interface CommentCreateResponse {
  commentId: number;
  success: boolean;
}

export const commentApi = {
  // 댓글 생성 (parentId 있으면 대댓글, 없으면 부모 댓글)
  async createComment(data: CommentCreateRequest): Promise<CommentCreateResponse> {
    const response = await authFetch(`${API_BASE_URL}/create/comment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('댓글 생성에 실패했습니다.');
    return response.json();
  },

  // 대댓글 목록 조회
  async getChildComments(
    parentId: number,
    page: number = 0,
    size: number = 5
  ): Promise<ChildCommentsSliceResponse> {
    const response = await authFetch(
      `${API_BASE_URL}/children-comments/${parentId}?page=${page}&size=${size}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('답글 조회에 실패했습니다.');
    return response.json();
  },

  // 댓글 수정
  async updateComment(commentId: number, data: CommentUpdateRequest): Promise<CommentCreateResponse> {
    const response = await authFetch(`${API_BASE_URL}/update/${commentId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('댓글 수정에 실패했습니다.');
    return response.json();
  },

  // 댓글 삭제 (부모/대댓글 통합)
  async deleteComment(commentId: number): Promise<CommentCreateResponse> {
    const response = await authFetch(`${API_BASE_URL}/remove/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('댓글 삭제에 실패했습니다.');
    return response.json();
  },
};

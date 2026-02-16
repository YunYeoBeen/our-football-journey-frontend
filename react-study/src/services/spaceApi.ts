import { authFetch } from './authFetch';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

// ─── Common Types ───

export interface SliceResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}

// ─── Todo Types ───

export type Priority = 'HIGH' | 'NORMAL' | 'LOW';
export type TodoStatus = 'DONE' | 'DOING' | 'LATE';

export interface TodoItem {
  todoId: number;
  content: string;
  priority: Priority;
  dueDate: string;
  status: TodoStatus;
  writer: string;
}

export interface TodoCreateRequest {
  content: string;
  priority: Priority;
  dueDate?: string;
  completed?: boolean;
}

export interface TodoUpdateRequest {
  todoId: number;
  content: string;
  priority: Priority;
  dueDate?: string;
  completed?: boolean;
  writer?: string;
}

export interface TodoCUDResponse {
  todoId: number | null;
  success: boolean;
}

// ─── Memo Types ───

export type MemoColor = 'PINK' | 'BLUE' | 'GREEN' | 'YELLOW';

export interface MemoItem {
  memoId: number;
  content: string;
  color: MemoColor;
  writer: string;
  isPinned: boolean;
  createdAt: string;
}

export interface MemoCreateRequest {
  content: string;
  color: MemoColor;
  isPinned?: boolean;
}

export interface MemoUpdateRequest {
  memoId: number;
  content: string;
  color: MemoColor;
  isPinned: boolean;
}

export interface MemoCUDResponse {
  memoId: number;
  success: boolean;
}

// ─── Todo API ───

export const todoApi = {
  async getList(page = 0, size = 50): Promise<SliceResponse<TodoItem>> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/todo/all-list?page=${page}&size=${size}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Todo 조회에 실패했습니다.');
    return response.json();
  },

  async getDetail(todoId: number): Promise<TodoItem> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/todo/detail/${todoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Todo 상세 조회에 실패했습니다.');
    return response.json();
  },

  async create(data: TodoCreateRequest): Promise<TodoCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/todo/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Todo 생성에 실패했습니다.');
    return response.json();
  },

  async update(data: TodoUpdateRequest): Promise<TodoCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/todo/update/${data.todoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Todo 수정에 실패했습니다.');
    return response.json();
  },

  async toggleComplete(data: TodoUpdateRequest): Promise<TodoCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/todo/update/complete/${data.todoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Todo 상태 변경에 실패했습니다.');
    return response.json();
  },

  async delete(todoId: number): Promise<TodoCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/todo/delete/${todoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Todo 삭제에 실패했습니다.');
    return response.json();
  },
};

// ─── Memo API ───

export const memoApi = {
  async getList(page = 0, size = 50): Promise<SliceResponse<MemoItem>> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/memo/all-list?page=${page}&size=${size}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('메모 조회에 실패했습니다.');
    return response.json();
  },

  async getDetail(memoId: number): Promise<MemoItem> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/memo/detail/${memoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('메모 상세 조회에 실패했습니다.');
    return response.json();
  },

  async create(data: MemoCreateRequest): Promise<MemoCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/memo/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('메모 생성에 실패했습니다.');
    return response.json();
  },

  async update(data: MemoUpdateRequest): Promise<MemoCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/memo/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('메모 수정에 실패했습니다.');
    return response.json();
  },

  async delete(memoId: number): Promise<MemoCUDResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/memo/delete/${memoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('메모 삭제에 실패했습니다.');
    return response.json();
  },
};

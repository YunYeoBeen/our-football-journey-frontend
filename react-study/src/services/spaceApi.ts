import { authFetch } from './authFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Todo Types ───

export interface TodoItem {
  id: number;
  content: string;
  completed: boolean;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  dueDate: string | null;
  writer: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoListResponse {
  active: TodoItem[];
  completed: TodoItem[];
}

export interface TodoCreateRequest {
  content: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  dueDate?: string;
}

export interface TodoUpdateRequest {
  content?: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  dueDate?: string;
  completed?: boolean;
}

// ─── Memo Types ───

export interface MemoItem {
  id: number;
  content: string;
  color: 'PINK' | 'BLUE' | 'GREEN' | 'YELLOW';
  writer: string;
  createdAt: string;
}

export interface MemoCreateRequest {
  content: string;
  color?: 'PINK' | 'BLUE' | 'GREEN' | 'YELLOW';
}

export interface MemoUpdateRequest {
  content?: string;
  color?: 'PINK' | 'BLUE' | 'GREEN' | 'YELLOW';
}

// ─── Todo API ───

export const todoApi = {
  async getList(): Promise<TodoListResponse> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/todo/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Todo 조회에 실패했습니다.');
    return response.json();
  },

  async create(data: TodoCreateRequest): Promise<{ id: number }> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/todo/create`, {
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

  async update(todoId: number, data: TodoUpdateRequest): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/todo/${todoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Todo 수정에 실패했습니다.');
  },

  async toggle(todoId: number): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/todo/${todoId}/toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Todo 토글에 실패했습니다.');
  },

  async delete(todoId: number): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/todo/${todoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Todo 삭제에 실패했습니다.');
  },
};

// ─── Memo API ───

export const memoApi = {
  async getList(): Promise<MemoItem[]> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/memo/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('메모 조회에 실패했습니다.');
    return response.json();
  },

  async create(data: MemoCreateRequest): Promise<{ id: number }> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/memo/create`, {
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

  async update(memoId: number, data: MemoUpdateRequest): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/memo/${memoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('메모 수정에 실패했습니다.');
  },

  async delete(memoId: number): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await authFetch(`${API_BASE_URL}/api/v1/memo/${memoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('메모 삭제에 실패했습니다.');
  },
};

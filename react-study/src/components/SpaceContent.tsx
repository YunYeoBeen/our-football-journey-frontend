import { useState, useEffect, useRef, useCallback } from 'react';
import { todoApi, memoApi } from '../services/spaceApi';
import type { TodoItem, MemoItem } from '../services/spaceApi';
import { message } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import AddTodoModal from './AddTodoModal';
import AddMemoModal from './AddMemoModal';
import EditTodoModal from './EditTodoModal';
import EditMemoModal from './EditMemoModal';
import '../styles/SpaceContent.css';

dayjs.extend(relativeTime);
dayjs.locale('ko');

const memoBgMap: Record<string, string> = {
  PINK: '#fdf2f8',
  BLUE: '#eff6ff',
  GREEN: '#f0fdf4',
  YELLOW: '#fefce8',
};

const memoBorderMap: Record<string, string> = {
  PINK: '#E91E8C',
  BLUE: '#3b82f6',
  GREEN: '#22c55e',
  YELLOW: '#eab308',
};

type SpaceTab = 'todo' | 'memo';

const SpaceContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SpaceTab>('todo');
  const [activeTodos, setActiveTodos] = useState<TodoItem[]>([]);
  const [completedTodos, setCompletedTodos] = useState<TodoItem[]>([]);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showAddMemo, setShowAddMemo] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const fetchTodos = useCallback(async () => {
    try {
      const data = await todoApi.getList();
      const todos = data.content;
      setActiveTodos(todos.filter(t => t.status !== 'DONE'));
      setCompletedTodos(todos.filter(t => t.status === 'DONE'));
    } catch {
      // API 연결 전에는 빈 배열 유지
    }
  }, []);

  const fetchMemos = useCallback(async () => {
    try {
      const data = await memoApi.getList();
      // pinned 메모를 최상단에 정렬
      const sortedMemos = [...data.content].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      setMemos(sortedMemos);
    } catch {
      // API 연결 전에는 빈 배열 유지
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTodos(), fetchMemos()]);
      setLoading(false);
    };
    load();
  }, [fetchTodos, fetchMemos]);

  const handleScroll = useCallback(() => {
    if (isScrollingRef.current || !scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const newTab: SpaceTab = scrollLeft > clientWidth * 0.5 ? 'memo' : 'todo';
    setActiveTab(newTab);
  }, []);

  const scrollToTab = useCallback((tab: SpaceTab) => {
    if (!scrollRef.current) return;
    isScrollingRef.current = true;
    const left = tab === 'memo' ? scrollRef.current.clientWidth : 0;
    scrollRef.current.scrollTo({ left, behavior: 'smooth' });
    setActiveTab(tab);
    setTimeout(() => { isScrollingRef.current = false; }, 400);
  }, []);

  const handleToggleTodo = async (e: React.MouseEvent, todo: TodoItem) => {
    e.stopPropagation();
    try {
      const isCompleted = todo.status === 'DONE';
      await todoApi.toggleComplete({
        todoId: todo.todoId,
        content: todo.content,
        priority: todo.priority,
        dueDate: todo.dueDate,
        completed: !isCompleted,
      });
      await fetchTodos();
    } catch {
      message.error('변경에 실패했습니다.');
    }
  };

  const handleDeleteTodo = async (e: React.MouseEvent, todoId: number) => {
    e.stopPropagation();
    try {
      await todoApi.delete(todoId);
      await fetchTodos();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  const handleDeleteMemo = async (e: React.MouseEvent, memoId: number) => {
    e.stopPropagation();
    try {
      await memoApi.delete(memoId);
      await fetchMemos();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = dayjs(dueDate);
    const today = dayjs().startOf('day');
    const diff = due.diff(today, 'day');
    if (diff < 0) return `${Math.abs(diff)}일 지남`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 7) return due.format('dddd');
    return due.format('YYYY-MM-DD');
  };

  if (loading) {
    return (
      <div className="space-loading">
        <div className="space-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space">
      {/* Sticky Tab Bar */}
      <div className="space-tabs">
        <div className="space-tabs-inner">
          {(['todo', 'memo'] as SpaceTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => scrollToTab(tab)}
              className={`space-tab-btn ${activeTab === tab ? 'space-tab-btn--active' : 'space-tab-btn--inactive'}`}
            >
              {tab === 'todo' ? 'To-Do' : 'Memos'}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div ref={scrollRef} onScroll={handleScroll} className="space-scroll-container">
        {/* Todo Section */}
        <div className="space-section">
          <div className="space-section-header">
            <span className="space-section-label">Active Tasks</span>
            <span className="space-section-count">{activeTodos.length} tasks left</span>
          </div>

          {activeTodos.length === 0 && (
            <div className="space-empty">할 일이 없습니다</div>
          )}

          {activeTodos.map((todo) => (
            <div
              key={todo.todoId}
              className="space-todo-item"
              onClick={() => setEditingTodo(todo)}
              style={{ cursor: 'pointer' }}
            >
              {/* Toggle Switch */}
              <button
                onClick={(e) => handleToggleTodo(e, todo)}
                className="space-todo-toggle"
              >
                <div className="space-todo-toggle-track">
                  <div className="space-todo-toggle-thumb" />
                </div>
              </button>
              <div className="space-todo-content">
                <p className="space-todo-text">{todo.content}</p>
                <div className="space-todo-meta">
                  {/* Priority Tag */}
                  <span className={`space-todo-priority-tag space-todo-priority-tag--${todo.priority.toLowerCase()}`}>
                    {todo.priority === 'HIGH' && <><span className="icon" style={{ fontSize: 12 }}>priority_high</span>높음</>}
                    {todo.priority === 'NORMAL' && <><span className="icon" style={{ fontSize: 12 }}>remove</span>보통</>}
                    {todo.priority === 'LOW' && <><span className="icon" style={{ fontSize: 12 }}>arrow_downward</span>낮음</>}
                  </span>
                  {todo.dueDate && (
                    <span className={`space-todo-due ${todo.status === 'LATE' ? 'space-todo-due--late' : ''}`}>
                      <span className="icon" style={{ fontSize: 14 }}>schedule</span>
                      {todo.status === 'LATE' ? formatDueDate(todo.dueDate) : formatDueDate(todo.dueDate)}
                    </span>
                  )}
                  <span className="space-todo-writer">
                    <span className="icon" style={{ fontSize: 14 }}>person</span>
                    {todo.writer}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteTodo(e, todo.todoId)}
                className="space-todo-delete-btn"
              >
                <span className="icon" style={{ fontSize: 18 }}>delete</span>
              </button>
            </div>
          ))}

          {/* Completed Tasks */}
          {completedTodos.length > 0 && (
            <>
              <div className="space-section-header" style={{ marginTop: 24 }}>
                <span className="space-section-label">Completed</span>
              </div>
              {completedTodos.map((todo) => (
                <div
                  key={todo.todoId}
                  className="space-todo-item space-todo-item--completed"
                  onClick={() => setEditingTodo(todo)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Toggle Switch - Completed */}
                  <button
                    onClick={(e) => handleToggleTodo(e, todo)}
                    className="space-todo-toggle space-todo-toggle--completed"
                  >
                    <div className="space-todo-toggle-track space-todo-toggle-track--completed">
                      <div className="space-todo-toggle-thumb space-todo-toggle-thumb--completed" />
                    </div>
                  </button>
                  <div className="space-todo-content">
                    <p className="space-todo-text space-todo-text--completed">{todo.content}</p>
                    <span className="space-completed-time">
                      Completed by {todo.writer}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTodo(e, todo.todoId)}
                    className="space-todo-delete-btn"
                  >
                    <span className="icon" style={{ fontSize: 18 }}>delete</span>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Memo Section */}
        <div className="space-section">
          <div className="space-section-header">
            <span className="space-section-label">Shared Memos</span>
          </div>

          {memos.length === 0 && (
            <div className="space-empty">메모가 없습니다</div>
          )}

          <div className="space-memo-grid">
            {memos.map((memo) => (
              <div
                key={memo.memoId}
                className={`space-memo-item ${memo.isPinned ? 'space-memo-item--pinned' : ''}`}
                style={{
                  backgroundColor: memoBgMap[memo.color] || memoBgMap.PINK,
                  borderLeftColor: memoBorderMap[memo.color] || memoBorderMap.PINK,
                  cursor: 'pointer',
                }}
                onClick={() => setEditingMemo(memo)}
              >
                {memo.isPinned && (
                  <span className="space-memo-pin">
                    <span className="icon" style={{ fontSize: 14 }}>push_pin</span>
                  </span>
                )}
                <p className="space-memo-text">{memo.content}</p>
                <div className="space-memo-footer">
                  <span className="space-memo-time">{dayjs(memo.createdAt).fromNow()}</span>
                  <button
                    onClick={(e) => handleDeleteMemo(e, memo.memoId)}
                    className="space-memo-delete-btn"
                  >
                    <span className="icon" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => activeTab === 'todo' ? setShowAddTodo(true) : setShowAddMemo(true)}
        className="space-fab"
      >
        <span className="icon" style={{ fontSize: 28 }}>add</span>
      </button>

      {/* Modals */}
      <AddTodoModal visible={showAddTodo} onClose={() => setShowAddTodo(false)} onCreated={fetchTodos} />
      <AddMemoModal visible={showAddMemo} onClose={() => setShowAddMemo(false)} onCreated={fetchMemos} />
      <EditTodoModal visible={!!editingTodo} todo={editingTodo} onClose={() => setEditingTodo(null)} onUpdated={fetchTodos} />
      <EditMemoModal visible={!!editingMemo} memo={editingMemo} onClose={() => setEditingMemo(null)} onUpdated={fetchMemos} />
    </div>
  );
};

export default SpaceContent;

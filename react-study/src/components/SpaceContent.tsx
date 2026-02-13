import { useState, useEffect, useRef, useCallback } from 'react';
import { todoApi, memoApi } from '../services/spaceApi';
import type { TodoItem, MemoItem } from '../services/spaceApi';
import { message } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import AddTodoModal from './AddTodoModal';
import AddMemoModal from './AddMemoModal';

dayjs.extend(relativeTime);
dayjs.locale('ko');

const colors = {
  primary: '#E91E8C',
  primaryLight: '#fce4ec',
  textDark: '#181110',
  textMuted: '#8d645e',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  white: '#ffffff',
  priorityHigh: '#ef4444',
  priorityLow: '#9ca3af',
  checkCompleted: '#ffb4a8',
  memoPink: '#E91E8C',
  memoBlue: '#3b82f6',
  memoGreen: '#22c55e',
  memoYellow: '#eab308',
};

const memoBgMap: Record<string, string> = {
  PINK: '#fdf2f8',
  BLUE: '#eff6ff',
  GREEN: '#f0fdf4',
  YELLOW: '#fefce8',
};

const memoBorderMap: Record<string, string> = {
  PINK: colors.memoPink,
  BLUE: colors.memoBlue,
  GREEN: colors.memoGreen,
  YELLOW: colors.memoYellow,
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // ─── Data fetching ───

  const fetchTodos = useCallback(async () => {
    try {
      const data = await todoApi.getList();
      setActiveTodos(data.active);
      setCompletedTodos(data.completed);
    } catch {
      // API 연결 전에는 빈 배열 유지
    }
  }, []);

  const fetchMemos = useCallback(async () => {
    try {
      const data = await memoApi.getList();
      setMemos(data);
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

  // ─── Horizontal scroll ↔ tab sync ───

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

  // ─── Todo actions ───

  const handleToggleTodo = async (todoId: number) => {
    try {
      await todoApi.toggle(todoId);
      await fetchTodos();
    } catch {
      message.error('변경에 실패했습니다.');
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      await todoApi.delete(todoId);
      await fetchTodos();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  const handleDeleteMemo = async (memoId: number) => {
    try {
      await memoApi.delete(memoId);
      await fetchMemos();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  // ─── Due date formatting ───

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = dayjs(dueDate);
    const today = dayjs().startOf('day');
    const diff = due.diff(today, 'day');
    if (diff < 0) return `${Math.abs(diff)}일 지남`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 7) return due.format('dddd');
    return due.format('M/D');
  };

  // ─── Render ───

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <div style={{
          width: 32, height: 32, border: `3px solid ${colors.gray200}`,
          borderTopColor: colors.primary, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ─── Sticky Tab Bar ─── */}
      <div style={{
        position: 'sticky',
        top: 72,
        zIndex: 10,
        backgroundColor: colors.white,
        padding: '12px 16px 0',
      }}>
        <div style={{
          display: 'flex',
          backgroundColor: colors.gray100,
          borderRadius: 12,
          padding: 4,
        }}>
          {(['todo', 'memo'] as SpaceTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => scrollToTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                transition: 'all 0.2s',
                backgroundColor: activeTab === tab ? colors.white : 'transparent',
                color: activeTab === tab ? colors.primary : colors.textMuted,
                boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab === 'todo' ? 'To-Do' : 'Memos'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Horizontal Scroll Container ─── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* ─── Todo Section ─── */}
        <div style={{ minWidth: '100%', scrollSnapAlign: 'start', padding: '16px 16px 100px' }}>
          {/* Active Tasks */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase' }}>
              Active Tasks
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.primary }}>
              {activeTodos.length} tasks left
            </span>
          </div>

          {activeTodos.length === 0 && (
            <div style={{
              padding: 32, textAlign: 'center', color: colors.gray400,
              backgroundColor: colors.gray50, borderRadius: 16, fontSize: 14,
            }}>
              할 일이 없습니다
            </div>
          )}

          {activeTodos.map((todo) => (
            <div
              key={todo.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '16px 18px', backgroundColor: colors.white,
                borderRadius: 16, marginBottom: 10,
                border: `1px solid ${colors.gray200}`,
                transition: 'transform 0.15s',
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleTodo(todo.id)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `2px solid ${colors.gray200}`, background: 'none',
                  cursor: 'pointer', flexShrink: 0, marginTop: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.textDark, lineHeight: 1.4 }}>
                  {todo.content}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {todo.priority === 'HIGH' && (
                    <span style={{ fontSize: 12, color: colors.priorityHigh, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>priority_high</span>
                      High priority
                    </span>
                  )}
                  {todo.dueDate && (
                    <span style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>schedule</span>
                      Due: {formatDueDate(todo.dueDate)}
                    </span>
                  )}
                  {!todo.priority || (todo.priority === 'NORMAL' && !todo.dueDate) ? (
                    <span style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 14 }}>person</span>
                      Added by {todo.writer}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
                  color: colors.gray400, display: 'flex', alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18 }}>close</span>
              </button>
            </div>
          ))}

          {/* Completed Tasks */}
          {completedTodos.length > 0 && (
            <>
              <div style={{ marginTop: 24, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase' }}>
                  Completed
                </span>
              </div>
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px', backgroundColor: colors.gray50,
                    borderRadius: 16, marginBottom: 8,
                  }}
                >
                  <button
                    onClick={() => handleToggleTodo(todo.id)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: 'none', backgroundColor: colors.checkCompleted,
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16, color: colors.white }}>check</span>
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, color: colors.gray400, textDecoration: 'line-through' }}>
                      {todo.content}
                    </p>
                    <span style={{ fontSize: 11, color: colors.gray400 }}>
                      Completed {dayjs(todo.updatedAt).fromNow()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: colors.gray400, display: 'flex',
                    }}
                  >
                    <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 18 }}>close</span>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ─── Memo Section ─── */}
        <div style={{ minWidth: '100%', scrollSnapAlign: 'start', padding: '16px 16px 100px' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: colors.textMuted, textTransform: 'uppercase' }}>
              Shared Memos
            </span>
          </div>

          {memos.length === 0 && (
            <div style={{
              padding: 32, textAlign: 'center', color: colors.gray400,
              backgroundColor: colors.gray50, borderRadius: 16, fontSize: 14,
            }}>
              메모가 없습니다
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {memos.map((memo) => (
              <div
                key={memo.id}
                style={{
                  position: 'relative',
                  backgroundColor: memoBgMap[memo.color] || memoBgMap.PINK,
                  borderRadius: 16,
                  padding: 16,
                  borderLeft: `4px solid ${memoBorderMap[memo.color] || memoBorderMap.PINK}`,
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 500, color: colors.textDark,
                  lineHeight: 1.5, overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                }}>
                  {memo.content}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>
                    {dayjs(memo.createdAt).fromNow()}
                  </span>
                  <button
                    onClick={() => handleDeleteMemo(memo.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                      color: colors.gray400, display: 'flex',
                    }}
                  >
                    <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: 16 }}>close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── FAB Button ─── */}
      <button
        onClick={() => activeTab === 'todo' ? setShowAddTodo(true) : setShowAddMemo(true)}
        style={{
          position: 'fixed',
          bottom: 96,
          right: 'max(16px, calc((100vw - 448px) / 2 + 16px))',
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: colors.primary,
          color: colors.white, border: 'none',
          boxShadow: `0 8px 24px ${colors.primary}40`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 40,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: 28, fontFamily: 'Material Symbols Outlined' }}>add</span>
      </button>

      {/* ─── Modals ─── */}
      <AddTodoModal
        visible={showAddTodo}
        onClose={() => setShowAddTodo(false)}
        onCreated={fetchTodos}
      />
      <AddMemoModal
        visible={showAddMemo}
        onClose={() => setShowAddMemo(false)}
        onCreated={fetchMemos}
      />

      {/* Hide scrollbar */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default SpaceContent;

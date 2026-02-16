import { useState, useEffect } from 'react';
import { message } from 'antd';
import { todoApi } from '../services/spaceApi';
import type { TodoItem } from '../services/spaceApi';

const colors = {
  primary: '#E91E8C',
  textDark: '#181110',
  textMuted: '#8d645e',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  white: '#ffffff',
  priorityHigh: '#ef4444',
  priorityNormal: '#8d645e',
  priorityLow: '#9ca3af',
  danger: '#ef4444',
};

type Priority = 'HIGH' | 'NORMAL' | 'LOW';

interface Props {
  visible: boolean;
  todo: TodoItem | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditTodoModal({ visible, todo, onClose, onUpdated }: Props) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (todo) {
      setContent(todo.content);
      setPriority(todo.priority);
      setDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
    }
  }, [todo]);

  if (!visible || !todo) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      message.warning('할 일을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await todoApi.update({
        todoId: todo.todoId,
        content: content.trim(),
        priority,
        ...(dueDate && { dueDate: `${dueDate}T23:59:59` }),
        completed: todo.status === 'DONE',
      });
      message.success('수정되었습니다!');
      onClose();
      await onUpdated();
    } catch {
      message.error('수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'HIGH', label: '높음', color: colors.priorityHigh },
    { value: 'NORMAL', label: '보통', color: colors.priorityNormal },
    { value: 'LOW', label: '낮음', color: colors.priorityLow },
  ];

  // 날짜 입력 포맷 검증 (yyyy-mm-dd)
  const handleDateChange = (value: string) => {
    // 숫자와 하이픈만 허용
    const cleaned = value.replace(/[^\d-]/g, '');

    // 자동 하이픈 추가
    let formatted = cleaned;
    if (cleaned.length >= 4 && cleaned[4] !== '-') {
      formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    }
    if (formatted.length >= 7 && formatted[7] !== '-') {
      formatted = formatted.slice(0, 7) + '-' + formatted.slice(7);
    }

    // 최대 10자리로 제한 (yyyy-mm-dd)
    setDueDate(formatted.slice(0, 10));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      />

      {/* Modal Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 448,
        backgroundColor: colors.white,
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        animation: 'slideUp 0.3s ease-out',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200, margin: '0 auto 20px' }} />

        {/* Title */}
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: colors.textDark }}>
          할 일 수정
        </h3>

        {/* Content input */}
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="할 일을 입력하세요"
          autoFocus
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 15,
            border: `1px solid ${colors.gray200}`,
            borderRadius: 12,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
          onBlur={(e) => e.currentTarget.style.borderColor = colors.gray200}
        />

        {/* Priority */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 8 }}>
            우선순위
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {priorities.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 10,
                  border: `2px solid ${priority === p.value ? p.color : colors.gray200}`,
                  backgroundColor: priority === p.value ? `${p.color}10` : colors.white,
                  color: priority === p.value ? p.color : colors.textMuted,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date - text input */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 8 }}>
            마감일 (선택, yyyy-mm-dd)
          </label>
          <input
            type="text"
            value={dueDate}
            onChange={(e) => handleDateChange(e.target.value)}
            placeholder="2026-03-06"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              border: `1px solid ${colors.gray200}`,
              borderRadius: 12,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              color: dueDate ? colors.textDark : colors.gray400,
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12,
              border: `1px solid ${colors.gray200}`, backgroundColor: colors.white,
              fontSize: 15, fontWeight: 700, color: colors.textMuted, cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12,
              border: 'none', backgroundColor: colors.primary,
              fontSize: 15, fontWeight: 700, color: colors.white, cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

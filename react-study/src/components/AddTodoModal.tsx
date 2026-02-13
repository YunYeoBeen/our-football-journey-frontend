import { useState } from 'react';
import { message } from 'antd';
import { todoApi } from '../services/spaceApi';

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
};

type Priority = 'HIGH' | 'NORMAL' | 'LOW';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export default function AddTodoModal({ visible, onClose, onCreated }: Props) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      message.warning('할 일을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await todoApi.create({
        content: content.trim(),
        priority,
        ...(dueDate && { dueDate }),
      });
      message.success('추가되었습니다!');
      setContent('');
      setPriority('NORMAL');
      setDueDate('');
      onClose();
      await onCreated();
    } catch {
      message.error('추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setPriority('NORMAL');
    setDueDate('');
    onClose();
  };

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'HIGH', label: '높음', color: colors.priorityHigh },
    { value: 'NORMAL', label: '보통', color: colors.priorityNormal },
    { value: 'LOW', label: '낮음', color: colors.priorityLow },
  ];

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
          새 할 일
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

        {/* Due date */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 8 }}>
            마감일 (선택)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
            {saving ? '추가 중...' : '추가'}
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

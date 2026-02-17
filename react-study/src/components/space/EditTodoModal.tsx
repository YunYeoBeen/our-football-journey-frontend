import { useState, useEffect } from 'react';
import { message } from 'antd';
import { todoApi } from '../../services/spaceApi';
import type { TodoItem } from '../../services/spaceApi';
import '../../styles/BottomSheetModal.css';

type Priority = 'HIGH' | 'NORMAL' | 'LOW';

interface Props {
  visible: boolean;
  todo: TodoItem | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'HIGH', label: '높음', color: '#ef4444' },
  { value: 'NORMAL', label: '보통', color: '#8d645e' },
  { value: 'LOW', label: '낮음', color: '#9ca3af' },
];

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

  const handleDateChange = (value: string) => {
    // 삭제 중이면 그대로 설정 (자동 포맷팅 안함)
    if (value.length < dueDate.length) {
      setDueDate(value);
      return;
    }

    // 숫자만 허용
    const cleaned = value.replace(/[^\d]/g, '');
    let formatted = '';

    // YYYY-MM-DD 형식으로 자동 포맷팅
    if (cleaned.length >= 4) {
      formatted = cleaned.slice(0, 4);
      if (cleaned.length >= 5) {
        formatted += '-' + cleaned.slice(4, 6);
        if (cleaned.length >= 7) {
          formatted += '-' + cleaned.slice(6, 8);
        }
      }
    } else {
      formatted = cleaned;
    }

    setDueDate(formatted);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-card">
        <div className="modal-handle" />
        <h3 className="modal-title">할 일 수정</h3>

        <input
          type="text"
          className="modal-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="할 일을 입력하세요"
          autoFocus
        />

        <div className="modal-field-group">
          <label className="modal-label">우선순위</label>
          <div className="modal-option-group">
            {priorities.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className="modal-option-btn"
                style={{
                  border: `2px solid ${priority === p.value ? p.color : '#e5e7eb'}`,
                  backgroundColor: priority === p.value ? `${p.color}10` : '#ffffff',
                  color: priority === p.value ? p.color : '#8d645e',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-field-group">
          <label className="modal-label">마감일 (선택, yyyy-mm-dd)</label>
          <input
            type="text"
            className="modal-input"
            value={dueDate}
            onChange={(e) => handleDateChange(e.target.value)}
            placeholder="2026-03-06"
          />
        </div>

        <div className="modal-buttons">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            취소
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

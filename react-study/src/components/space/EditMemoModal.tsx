import { useState, useEffect } from 'react';
import { message } from 'antd';
import { memoApi } from '../../services/spaceApi';
import type { MemoItem } from '../../services/spaceApi';
import '../../styles/BottomSheetModal.css';

type MemoColor = 'PINK' | 'BLUE' | 'GREEN' | 'YELLOW';

interface Props {
  visible: boolean;
  memo: MemoItem | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

const colorOptions: { value: MemoColor; hex: string; bg: string }[] = [
  { value: 'PINK', hex: '#E91E8C', bg: '#fdf2f8' },
  { value: 'BLUE', hex: '#3b82f6', bg: '#eff6ff' },
  { value: 'GREEN', hex: '#22c55e', bg: '#f0fdf4' },
  { value: 'YELLOW', hex: '#eab308', bg: '#fefce8' },
];

export default function EditMemoModal({ visible, memo, onClose, onUpdated }: Props) {
  const [content, setContent] = useState('');
  const [color, setColor] = useState<MemoColor>('PINK');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (memo) {
      setContent(memo.content);
      setColor(memo.color);
      setIsPinned(memo.isPinned);
    }
  }, [memo]);

  if (!visible || !memo) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      message.warning('메모 내용을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await memoApi.update({ memoId: memo.memoId, content: content.trim(), color, isPinned });
      message.success('메모가 수정되었습니다!');
      onClose();
      await onUpdated();
    } catch {
      message.error('메모 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const selectedColorOption = colorOptions.find((c) => c.value === color)!;

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-card">
        <div className="modal-handle" />
        <h3 className="modal-title">메모 수정</h3>

        <div className="modal-field-group" style={{ marginTop: 0 }}>
          <label className="modal-label">색상</label>
          <div className="modal-color-group">
            {colorOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`modal-color-btn ${color === c.value ? 'modal-color-btn--selected' : ''}`}
                style={{
                  backgroundColor: c.hex,
                  boxShadow: color === c.value ? `0 0 0 2px ${c.hex}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div className="modal-field-group">
          <label className="modal-label">상단 고정</label>
          <div
            className="modal-toggle-row"
            onClick={() => setIsPinned(!isPinned)}
            style={{
              border: `2px solid ${isPinned ? '#E91E8C' : '#e5e7eb'}`,
              backgroundColor: isPinned ? '#fdf2f8' : '#ffffff',
            }}
          >
            <div className={`modal-toggle-switch ${isPinned ? 'modal-toggle-switch--on' : 'modal-toggle-switch--off'}`}>
              <div className={`modal-toggle-thumb ${isPinned ? 'modal-toggle-thumb--on' : 'modal-toggle-thumb--off'}`} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: isPinned ? '#E91E8C' : '#8d645e' }}>
              {isPinned ? '고정됨' : '고정 안 함'}
            </span>
            <span className="icon" style={{ fontSize: 18, color: isPinned ? '#E91E8C' : '#9ca3af', marginLeft: 'auto' }}>
              push_pin
            </span>
          </div>
        </div>

        <textarea
          className="modal-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모를 입력하세요..."
          autoFocus
          rows={5}
          style={{
            borderLeft: `4px solid ${selectedColorOption.hex}`,
            backgroundColor: selectedColorOption.bg,
            marginTop: 16,
          }}
        />

        <div className="modal-buttons" style={{ marginTop: 20 }}>
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

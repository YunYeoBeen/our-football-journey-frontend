import { useState } from 'react';
import { message } from 'antd';
import { memoApi } from '../../services/spaceApi';
import '../../styles/BottomSheetModal.css';

type MemoColor = 'PINK' | 'BLUE' | 'GREEN' | 'YELLOW';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

const colorOptions: { value: MemoColor; hex: string; bg: string }[] = [
  { value: 'PINK', hex: '#E91E8C', bg: '#fdf2f8' },
  { value: 'BLUE', hex: '#3b82f6', bg: '#eff6ff' },
  { value: 'GREEN', hex: '#22c55e', bg: '#f0fdf4' },
  { value: 'YELLOW', hex: '#eab308', bg: '#fefce8' },
];

export default function AddMemoModal({ visible, onClose, onCreated }: Props) {
  const [content, setContent] = useState('');
  const [color, setColor] = useState<MemoColor>('PINK');
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      message.warning('메모 내용을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await memoApi.create({ content: content.trim(), color, isPinned: false });
      message.success('메모가 추가되었습니다!');
      setContent('');
      setColor('PINK');
      onClose();
      await onCreated();
    } catch {
      message.error('메모 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setColor('PINK');
    onClose();
  };

  const selectedColorOption = colorOptions.find((c) => c.value === color)!;

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={handleClose} />

      <div className="modal-card">
        <div className="modal-handle" />
        <h3 className="modal-title">새 메모</h3>

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
          <button className="modal-btn modal-btn-cancel" onClick={handleClose}>
            취소
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

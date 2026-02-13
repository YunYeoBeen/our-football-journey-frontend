import { useState } from 'react';
import { message } from 'antd';
import { memoApi } from '../services/spaceApi';

const colors = {
  primary: '#E91E8C',
  textDark: '#181110',
  textMuted: '#8d645e',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  white: '#ffffff',
};

type MemoColor = 'PINK' | 'BLUE' | 'GREEN' | 'YELLOW';

const colorOptions: { value: MemoColor; hex: string; bg: string }[] = [
  { value: 'PINK', hex: '#E91E8C', bg: '#fdf2f8' },
  { value: 'BLUE', hex: '#3b82f6', bg: '#eff6ff' },
  { value: 'GREEN', hex: '#22c55e', bg: '#f0fdf4' },
  { value: 'YELLOW', hex: '#eab308', bg: '#fefce8' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

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
      await memoApi.create({ content: content.trim(), color });
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
          새 메모
        </h3>

        {/* Color picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 8 }}>
            색상
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            {colorOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: c.hex,
                  border: color === c.value ? '3px solid white' : '3px solid transparent',
                  boxShadow: color === c.value ? `0 0 0 2px ${c.hex}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모를 입력하세요..."
          autoFocus
          rows={5}
          style={{
            width: '100%',
            padding: 16,
            fontSize: 15,
            border: `1px solid ${colors.gray200}`,
            borderRadius: 16,
            borderLeft: `4px solid ${selectedColorOption.hex}`,
            backgroundColor: selectedColorOption.bg,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.6,
          }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
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

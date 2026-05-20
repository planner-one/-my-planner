import { useWidgetSize } from '../hooks/useWidgetSize'
import { useApp } from '../store/AppContext'

export const meta = {
  id: 'memo',
  name: '빠른 메모',
  icon: '📝',
  defaultW: 8,
  defaultH: 6,
  minW: 4,
  minH: 3,
  order: 2,
}

const LINE_H = 30

export function MemoActions() {
  const { setQuickMemo } = useApp()
  return (
    <button
      onClick={() => setQuickMemo('')}
      style={{
        fontSize: 11, color: 'var(--muted)', background: 'transparent',
        border: '1px solid var(--border)', borderRadius: 4,
        cursor: 'pointer', padding: '2px 8px', fontFamily: 'inherit',
      }}
    >
      초기화
    </button>
  )
}

export default function MemoWidget() {
  const { ref } = useWidgetSize()
  const { quickMemo, setQuickMemo } = useApp()

  return (
    <div ref={ref} style={{
      width: '100%', height: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
    }}>
      <textarea
        value={quickMemo}
        onChange={e => setQuickMemo(e.target.value)}
        placeholder="메모를 입력하세요..."
        style={{
          width: '100%',
          height: '100%',
          resize: 'none',
          border: 'none',
          outline: 'none',
          color: 'var(--text)',
          fontSize: 15,
          lineHeight: `${LINE_H}px`,
          fontFamily: 'inherit',
          padding: '2px 12px 0',
          boxSizing: 'border-box',
          background: `repeating-linear-gradient(
            to bottom,
            transparent,
            transparent ${LINE_H - 1}px,
            var(--border) ${LINE_H - 1}px,
            var(--border) ${LINE_H}px
          )`,
          backgroundAttachment: 'local',
        }}
      />
    </div>
  )
}

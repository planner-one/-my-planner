import { useApp } from '../store/AppContext'

export const meta = {
  id: 'review',
  name: '하루 마무리',
  icon: '🌙',
  defaultW: 8,
  defaultH: 8,
  minW: 5,
  minH: 5,
  order: 11,
}

const QUESTIONS = [
  { key: 'r1' as const, label: '오늘 잘한 일은?' },
  { key: 'r2' as const, label: '개선할 점은?' },
  { key: 'r3' as const, label: '내일 가장 중요한 일은?' },
]

export default function ReviewWidget() {
  const { review, setReview } = useApp()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 14px', boxSizing: 'border-box', gap: 10, overflowY: 'auto' }}>
      {QUESTIONS.map(q => (
        <div key={q.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{q.label}</label>
          <textarea
            value={review[q.key]}
            onChange={e => setReview(prev => ({ ...prev, [q.key]: e.target.value }))}
            rows={3}
            placeholder="내용을 입력하세요..."
            style={{
              resize: 'none', border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 13,
              padding: '8px 10px', outline: 'none', fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
        </div>
      ))}
    </div>
  )
}

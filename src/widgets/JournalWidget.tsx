import { useEffect, useState } from 'react'
import QuickAddModal from '../components/QuickAddModal'

export const meta = {
  id: 'journalFeed',
  name: '저널 알림',
  icon: '📔',
  defaultW: 8,
  defaultH: 7,
  minW: 5,
  minH: 4,
  order: 15,
}

interface JournalItem {
  title?: string
  message?: string
  content?: string
  text?: string
  date?: string
  link?: string
}

const LS_KEY = 'journal_webhook_url'
const MAX_ITEMS = 4

// n8n 연결 전/실패 시 위젯 모양을 미리 보기 위한 목 데이터
const MOCK_ITEMS: JournalItem[] = [
  { title: '오늘의 저널', message: '오늘 가장 기억에 남는 순간은 무엇인가요?', date: '예시' },
  { title: '오늘의 저널', message: '지금 가장 신경 쓰이는 일은 무엇인가요?', date: '예시' },
  { title: '오늘의 저널', message: '오늘 감사했던 일 한 가지를 적어보세요.', date: '예시' },
  { title: '오늘의 저널', message: '내일 나에게 하고 싶은 말은?', date: '예시' },
]

// n8n Aggregate 노드 출력은 워크플로우마다 형태가 달라질 수 있어
// 배열/단일 객체/래핑된 객체를 모두 받아 4개 배열로 정규화
function normalizeItems(data: unknown): JournalItem[] {
  if (Array.isArray(data)) return data.slice(0, MAX_ITEMS)
  if (data && typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>)
    const arrayField = values.find(v => Array.isArray(v)) as JournalItem[] | undefined
    if (arrayField) return arrayField.slice(0, MAX_ITEMS)
    return [data as JournalItem]
  }
  return []
}

function itemText(item: JournalItem): string {
  return item.message ?? item.content ?? item.text ?? '내용 없음'
}

export default function JournalWidget() {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem(LS_KEY) ?? '')
  const [items, setItems] = useState<JournalItem[]>(MOCK_ITEMS)
  const [isMock, setIsMock] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [urlInput, setUrlInput] = useState(webhookUrl)

  const load = async (url: string) => {
    if (!url) {
      setItems(MOCK_ITEMS)
      setIsMock(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (!text) throw new Error('빈 응답')
      const data = JSON.parse(text)
      const normalized = normalizeItems(data)
      if (normalized.length === 0) throw new Error('빈 데이터')
      setItems(normalized)
      setIsMock(false)
    } catch {
      setError('연결 실패 — 예시 데이터를 보여드려요')
      setItems(MOCK_ITEMS)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(webhookUrl)
  }, [webhookUrl])

  const saveUrl = () => {
    const url = urlInput.trim()
    localStorage.setItem(LS_KEY, url)
    setWebhookUrl(url)
    setShowSettings(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '10px 14px', boxSizing: 'border-box', gap: 8, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          {isMock ? '예시 데이터 (n8n 미연결)' : '연결됨'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => load(webhookUrl)}
            disabled={loading}
            title="새로고침"
            aria-label="새로고침"
            style={{
              width: 28, padding: 0, borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--muted)', fontSize: 13, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            ↻
          </button>
          <button
            type="button"
            onClick={() => { setUrlInput(webhookUrl); setShowSettings(true) }}
            style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            웹훅 설정
          </button>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0 }}>{error}</div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        {items.slice(0, MAX_ITEMS).map((item, i) => (
          <div
            key={i}
            style={{
              border: 'none', borderRadius: 10, background: 'var(--bg3)',
              padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 3,
            }}
          >
            {item.title && (
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{item.title}</span>
            )}
            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.4 }}>
              {itemText(item)}
            </span>
            {item.date && (
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{item.date}</span>
            )}
          </div>
        ))}
      </div>

      {showSettings && (
        <QuickAddModal title="n8n 웹훅 설정" onClose={() => setShowSettings(false)}>
          <input
            autoFocus
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveUrl() }}
            placeholder="https://.../webhook/journal-widget"
            style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 13,
              padding: '9px 12px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            n8n 워크플로우를 Active로 켠 뒤, Webhook 노드의 Production URL을 입력하세요.
            Test URL은 1회만 동작해서 위젯에는 쓸 수 없어요.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              style={{
                border: '1px solid var(--border)', borderRadius: 7, background: 'transparent',
                color: 'var(--muted)', fontSize: 13, padding: '8px 14px', cursor: 'pointer',
              }}
            >취소</button>
            <button
              type="button"
              onClick={saveUrl}
              style={{
                border: 'none', borderRadius: 7, background: 'var(--accent)',
                color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 14px', cursor: 'pointer',
              }}
            >저장</button>
          </div>
        </QuickAddModal>
      )}
    </div>
  )
}

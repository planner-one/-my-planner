import { useEffect, useState } from 'react'

const WEBHOOK_URL = 'https://dbp-jack.app.n8n.cloud/webhook/journal-widget'

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
  return item.message ?? item.content ?? item.text ?? item.title ?? '내용 없음'
}

export default function JournalWidget() {
  const [items, setItems] = useState<JournalItem[]>(MOCK_ITEMS)
  const [isMock, setIsMock] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slide, setSlide] = useState(0)

  const load = async (url: string) => {
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
      setSlide(0)
    } catch {
      setError('연결 실패 — 예시 데이터를 보여드려요')
      setItems(MOCK_ITEMS)
      setIsMock(true)
      setSlide(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(WEBHOOK_URL)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '10px 14px', boxSizing: 'border-box', gap: 8, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
          {isMock ? '예시 데이터 (n8n 미연결)' : '연결됨'}
        </span>
        <button
          type="button"
          onClick={() => load(WEBHOOK_URL)}
          disabled={loading}
          title="새로고침"
          aria-label="새로고침"
          style={{
            width: 28, padding: 0, borderRadius: 6, flexShrink: 0,
            border: '1px solid var(--border)', background: 'var(--bg3)',
            color: 'var(--muted)', fontSize: 13, cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          ↻
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0 }}>{error}</div>
      )}

      <JournalCarousel items={items.slice(0, MAX_ITEMS)} slide={slide} setSlide={setSlide} />
    </div>
  )
}

interface JournalCarouselProps {
  items: JournalItem[]
  slide: number
  setSlide: (updater: (prev: number) => number) => void
}

function JournalCarousel({ items, slide, setSlide }: JournalCarouselProps) {
  const count = items.length
  const goPrev = () => setSlide(prev => (prev - 1 + count) % count)
  const goNext = () => setSlide(prev => (prev + 1) % count)

  if (count === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>
        표시할 항목이 없어요
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={count < 2}
          aria-label="이전"
          style={carouselArrowStyle(count < 2)}
        >
          ‹
        </button>

        <div style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', position: 'relative', borderRadius: 12 }}>
          <div style={{
            display: 'flex', height: '100%', width: `${count * 100}%`,
            transform: `translateX(-${slide * (100 / count)}%)`,
            transition: 'transform 0.3s ease',
          }}>
            {items.map((item, i) => {
              const body = itemText(item)
              const showTitleLabel = Boolean(item.title) && item.title !== body
              const Wrapper = item.link ? 'a' : 'div'
              return (
                <Wrapper
                  key={i}
                  {...(item.link ? { href: item.link, target: '_blank', rel: 'noreferrer' } : {})}
                  style={{
                    flex: `0 0 ${100 / count}%`, minWidth: 0, boxSizing: 'border-box',
                    height: '100%', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', gap: 8, padding: '16px 18px',
                    background: 'var(--bg3)', textDecoration: 'none',
                    cursor: item.link ? 'pointer' : 'default',
                  }}
                >
                  {showTitleLabel && (
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{item.title}</span>
                  )}
                  <span style={{
                    fontSize: 16, color: 'var(--text)', fontWeight: 700, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {body}
                  </span>
                  {item.date && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.date}</span>
                  )}
                </Wrapper>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={count < 2}
          aria-label="다음"
          style={carouselArrowStyle(count < 2)}
        >
          ›
        </button>
      </div>

      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, flexShrink: 0 }}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(() => i)}
              aria-label={`${i + 1}번째`}
              style={{
                width: i === slide ? 16 : 6, height: 6, borderRadius: 999,
                border: 'none', padding: 0, cursor: 'pointer',
                background: i === slide ? 'var(--accent)' : 'var(--bg4)',
                transition: 'width 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function carouselArrowStyle(disabled: boolean) {
  return {
    flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
    border: '1px solid var(--border)', background: 'var(--bg3)',
    color: disabled ? 'var(--muted)' : 'var(--text)',
    fontSize: 18, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  } as const
}

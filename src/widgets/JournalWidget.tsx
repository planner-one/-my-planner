import { useEffect, useState } from 'react'

const WEBHOOK_URL = 'https://dbp-jack.app.n8n.cloud/webhook/journal-widget'

// JournalActions(제목줄)와 JournalWidget(본문)이 별개 위치에 렌더링되므로
// "새로고침" 요청만 작은 pub/sub로 전달
const refreshListeners = new Set<() => void>()
function requestJournalRefresh() {
  refreshListeners.forEach(listener => listener())
}
function subscribeJournalRefresh(listener: () => void) {
  refreshListeners.add(listener)
  return () => { refreshListeners.delete(listener) }
}

export function JournalActions() {
  return (
    <button
      type="button"
      onClick={requestJournalRefresh}
      title="새로고침"
      aria-label="새로고침"
      style={{
        width: 26, height: 26, padding: 0,
        border: '1px solid var(--border)', borderRadius: 6,
        background: 'transparent', color: 'var(--accent)',
        fontSize: 14, cursor: 'pointer',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}
    >
      ↻
    </button>
  )
}

export const meta = {
  id: 'journalFeed',
  name: '저널 알림',
  icon: '📔',
  defaultW: 8,
  defaultH: 7,
  minW: 5,
  minH: 4,
  order: 14,
  Actions: JournalActions,
  hideHeaderLabel: true,
}

interface JournalItem {
  title?: string
  message?: string
  content?: string
  text?: string
  date?: string
  link?: string
  image?: string
  thumbnail?: string
  imageUrl?: string
}

function itemImage(item: JournalItem): string | undefined {
  return item.image ?? item.thumbnail ?? item.imageUrl
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
  const [error, setError] = useState('')
  const [slide, setSlide] = useState(0)

  const load = async (url: string) => {
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
      setSlide(0)
    } catch {
      setError('연결 실패 — 예시 데이터를 보여드려요')
      setItems(MOCK_ITEMS)
      setSlide(0)
    }
  }

  useEffect(() => {
    load(WEBHOOK_URL)
    return subscribeJournalRefresh(() => load(WEBHOOK_URL))
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      boxSizing: 'border-box', gap: 8, overflow: 'hidden',
    }}>
      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0, padding: '8px 14px 0' }}>{error}</div>
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
      <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', height: '100%', width: `${count * 100}%`,
          transform: `translateX(-${slide * (100 / count)}%)`,
          transition: 'transform 0.3s ease',
        }}>
          {items.map((item, i) => {
            const body = itemText(item)
            const image = itemImage(item)
            const Wrapper = item.link ? 'a' : 'div'
            return (
              <Wrapper
                key={i}
                {...(item.link ? { href: item.link, target: '_blank', rel: 'noreferrer' } : {})}
                style={{
                  flex: `0 0 ${100 / count}%`, minWidth: 0, boxSizing: 'border-box',
                  height: '100%', display: 'flex', flexDirection: 'column',
                  justifyContent: image ? 'flex-start' : 'center', gap: 8,
                  padding: image ? 0 : '16px 18px',
                  background: 'var(--bg3)', textDecoration: 'none',
                  cursor: item.link ? 'pointer' : 'default', overflow: 'hidden',
                }}
              >
                {image ? (
                  <img
                    src={image}
                    alt={body}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 8,
                  flex: 1, minHeight: 0, justifyContent: 'center',
                }}>
                <span style={{
                  fontSize: 16, color: 'var(--text)', fontWeight: 700, lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {body}
                </span>
                {item.date && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.date}</span>
                )}
                </div>
                )}
              </Wrapper>
            )
          })}
        </div>

        <button
          type="button"
          onClick={goPrev}
          disabled={count < 2}
          aria-label="이전"
          style={carouselArrowStyle(count < 2, 'left')}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={count < 2}
          aria-label="다음"
          style={carouselArrowStyle(count < 2, 'right')}
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

function carouselArrowStyle(disabled: boolean, side: 'left' | 'right') {
  return {
    position: 'absolute', top: '50%', [side]: 8,
    transform: 'translateY(-50%)', zIndex: 1,
    width: 30, height: 30, borderRadius: '50%',
    border: 'none', background: 'rgba(0,0,0,0.45)',
    color: disabled ? 'rgba(255,255,255,0.4)' : '#fff',
    fontSize: 18, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'grid', placeItems: 'center',
  } as const
}

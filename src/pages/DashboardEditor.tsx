import { useState, useRef, useEffect } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useApp } from '../store/AppContext'
import { WIDGETS, WIDGET_MAP } from '../widgets'
import type { LayoutItem } from '../types'

const COLS = 48
const ROW_H = 40
const GAP = 8

const normalizeLayout = (layout: LayoutItem[]): LayoutItem[] =>
  layout.map(item => ({
    ...item,
    x: Math.min(item.x, COLS - item.w),
    w: Math.min(item.w, COLS),
  }))

interface Props {
  onDone: () => void
}

export default function DashboardEditor({ onDone }: Props) {
  const { dashboardLayout, dashboardActive, setDashboardLayout, setDashboardActive, saveWithOverrides } = useApp()

  const [layout, setLayout] = useState<LayoutItem[]>(() =>
    normalizeLayout(
      dashboardActive
        .filter(id => WIDGET_MAP[id.split('-')[0]])
        .map(id => {
          const saved = dashboardLayout.find(l => l.i === id)
          const meta = WIDGET_MAP[id.split('-')[0]]
          return saved ?? {
            i: id, x: 0, y: 0,
            w: meta.defaultW, h: meta.defaultH,
            minW: meta.minW, minH: meta.minH,
          }
        })
    )
  )
  const [active, setActive] = useState<string[]>(dashboardActive)
  const [sidebarVisible, setSidebarVisible] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleDragStop = (newLayout: Layout[]) => {
    setLayout(normalizeLayout(newLayout as LayoutItem[]))
  }

  const handleResizeStop = (newLayout: Layout[]) => {
    setLayout(normalizeLayout(newLayout as LayoutItem[]))
  }

  const getBottomY = (currentLayout: LayoutItem[]) =>
    currentLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0)

  const hasOverlap = (others: LayoutItem[], x: number, y: number, w: number, h: number) =>
    others.some(l =>
      x < l.x + l.w && x + w > l.x &&
      y < l.y + l.h && y + h > l.y
    )

  const addWidget = (widgetId: string) => {
    const meta = WIDGET_MAP[widgetId]
    if (!meta) return

    // 이미 존재하면 기본 위치(0,0)가 비어 있으면 거기로, 아니면 최하단으로 이동
    const existing = active.find(id => id.split('-')[0] === widgetId)
    if (existing) {
      setLayout(prev => {
        const others = prev.filter(l => l.i !== existing)
        const targetY = hasOverlap(others, 0, 0, meta.defaultW, meta.defaultH)
          ? getBottomY(others)
          : 0
        return prev.map(l => l.i === existing ? { ...l, x: 0, y: targetY } : l)
      })
      return
    }

    // 없으면 최하단에 새로 추가
    const instanceId = `${widgetId}-${Date.now()}`
    setLayout(prev => {
      const bottomY = getBottomY(prev)
      const newItem: LayoutItem = {
        i: instanceId, x: 0, y: bottomY,
        w: meta.defaultW, h: meta.defaultH,
        minW: meta.minW, minH: meta.minH,
      }
      return [...prev, newItem]
    })
    setActive(prev => [...prev, instanceId])
  }

  const removeWidget = (instanceId: string) => {
    setLayout(prev => prev.filter(l => l.i !== instanceId))
    setActive(prev => prev.filter(id => id !== instanceId))
  }

  const save = () => {
    setDashboardLayout(layout)
    setDashboardActive(active)
    saveWithOverrides({ dashboardLayout: layout, dashboardActive: active })
    onDone()
  }

  const cancel = () => onDone()

  const HANDLE_H = 36

  return (
    <div
      style={{ position: 'relative', padding: '0 24px 24px' }}
      onMouseEnter={() => setSidebarVisible(true)}
      onMouseLeave={() => setSidebarVisible(false)}
    >
      {/* 헤더 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>나만의 플래너 편집</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={cancel} style={{
            padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
          }}>
            취소
          </button>
          <button onClick={save} style={{
            padding: '6px 16px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            저장
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* 캔버스 */}
        <div ref={containerRef} style={{ flex: 1, minWidth: 0 }}>
          {containerW > 0 && (
            <GridLayout
              layout={layout}
              cols={COLS}
              rowHeight={ROW_H}
              width={containerW}
              margin={[GAP, GAP]}
              containerPadding={[0, 0]}
              compactType={null}
              allowOverlap={false}
              isDraggable={true}
              isResizable={true}
              draggableHandle=".drag-handle"
              resizeHandles={['se', 'sw', 's', 'e', 'w']}
              onDragStop={handleDragStop}
              onResizeStop={handleResizeStop}
            >
              {layout.map(item => {
                const widgetId = item.i.split('-')[0]
                const meta = WIDGET_MAP[widgetId]
                if (!meta) return null
                const Comp = meta.component
                return (
                  <div key={item.i} style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 20, overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    height: '100%',
                  }}>
                    {/* 드래그 핸들 바 */}
                    <div className="drag-handle" style={{
                      height: HANDLE_H, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 12px', cursor: 'grab',
                      background: 'var(--bg2)', userSelect: 'none',
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ letterSpacing: 2 }}>⠿⠿</span>
                        <span>{meta.icon} {meta.name}</span>
                      </span>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => removeWidget(item.i)}
                        style={{
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          color: 'var(--muted)', fontSize: 16, lineHeight: 1,
                          padding: '0 4px',
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* 위젯 콘텐츠 — 클릭 차단 */}
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <Comp />
                      </div>
                    </div>
                  </div>
                )
              })}
            </GridLayout>
          )}

          {layout.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 200, color: 'var(--muted)', gap: 8,
              border: '2px dashed var(--border)', borderRadius: 12,
            }}>
              <span style={{ fontSize: 32 }}>➕</span>
              <p>오른쪽에서 위젯을 추가해보세요.</p>
            </div>
          )}
        </div>

        {/* 위젯 추가 사이드바 */}
        <div style={{
          width: sidebarVisible ? 160 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}>
          <div style={{
            width: 160, background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 12,
            padding: 12,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
              위젯 추가
            </p>
            {WIDGETS.map(w => (
              <button key={w.id} onClick={() => addWidget(w.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg3)',
                color: 'var(--text)', cursor: 'pointer', fontSize: 13,
                marginBottom: 6, textAlign: 'left',
              }}>
                <span>{w.icon}</span>
                <span>{w.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

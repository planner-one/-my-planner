import { useState, useRef, useEffect } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useApp } from '../store/AppContext'
import { WIDGET_MAP } from '../widgets'
import type { LayoutItem } from '../types'
import DashboardEditor from './DashboardEditor'

const COLS = 48
const ROW_H = 40
const GAP = 8

const normalizeLayout = (layout: LayoutItem[]): LayoutItem[] =>
  layout.map(item => ({
    ...item,
    x: Math.min(item.x, COLS - item.w),
    w: Math.min(item.w, COLS),
  }))

export default function Dashboard() {
  const { dashboardLayout, dashboardActive } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerW(el.clientWidth)
    const ro = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isEditing])

  if (isEditing) {
    return <DashboardEditor onDone={() => setIsEditing(false)} />
  }

  const layout = normalizeLayout(
    dashboardActive
      .filter(id => WIDGET_MAP[id.split('-')[0]])
      .map(id => {
        const saved = dashboardLayout.find(l => l.i === id)
        const meta = WIDGET_MAP[id.split('-')[0]]
        return saved ? {
          ...saved,
          minW: meta.minW,
          minH: meta.minH,
        } : {
          i: id, x: 0, y: 0,
          w: meta.defaultW, h: meta.defaultH,
          minW: meta.minW, minH: meta.minH,
        }
      })
  )

  return (
    <div style={{ position: 'relative', padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>나만의 플래너</h2>
        <button onClick={() => setIsEditing(true)} style={{
          padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
        }}>
          편집
        </button>
      </div>

      <div ref={containerRef} style={{ width: '100%' }}>
        {containerW > 0 && layout.length > 0 && (
          <GridLayout
            layout={layout}
            cols={COLS}
            rowHeight={ROW_H}
            width={containerW}
            margin={[GAP, GAP]}
            containerPadding={[0, 0]}
            compactType={null}
            allowOverlap={false}
            isDraggable={false}
            isResizable={false}
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
                  <div style={{
                    padding: '10px 14px 8px', fontSize: 13, fontWeight: 600,
                    color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>{meta.icon}</span>
                      <span>{meta.name}</span>
                    </div>
                    {meta.Actions && <meta.Actions />}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                      <Comp />
                    </div>
                  </div>
                </div>
              )
            })}
          </GridLayout>
        )}

        {dashboardActive.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 300, color: 'var(--muted)', gap: 12,
          }}>
            <span style={{ fontSize: 40 }}>📋</span>
            <p>위젯이 없습니다. 편집 버튼을 눌러 위젯을 추가해보세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}

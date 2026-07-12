import { useState, useRef, useEffect } from 'react'
import { LayoutDashboard, Minus, Plus, Settings2 } from 'lucide-react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useApp } from '../store/AppContext'
import { WIDGET_MAP } from '../widgets'
import type { LayoutItem } from '../types'
import DashboardEditor from './DashboardEditor'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import {
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_OPTIONS,
  normalizeUiScale,
} from '../utils/uiScale'

const COLS = 48
const ROW_H = 40
const GAP = 8
const MOBILE_BREAKPOINT = 768

const MOBILE_WIDGET_HEIGHTS: Record<string, number> = {
  clock: 220,
  weather: 210,
  memo: 190,
  todo: 300,
  scheduled: 180,
  habit: 260,
  pomodoro: 270,
  counter: 270,
  calendar: 380,
  chart: 240,
  goal: 260,
  workOverview: 260,
  menu: 240,
  review: 270,
  journalFeed: 270,
}

const normalizeLayout = (layout: LayoutItem[]): LayoutItem[] =>
  layout.map(item => {
    const minW = Math.min(item.minW ?? 1, COLS)
    const w = Math.min(Math.max(item.w, minW), COLS)
    return {
      ...item,
      x: Math.min(Math.max(item.x, 0), COLS - w),
      w,
      h: Math.max(item.h, item.minH ?? 1),
    }
  })

export default function Dashboard() {
  const {
    dashboardLayout, dashboardActive,
    uiScale, setUiScale, saveWithOverrides,
  } = useApp()
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
  const isMobileDashboard = containerW > 0 && containerW < MOBILE_BREAKPOINT
  const orderedLayout = [...layout].sort((a, b) => (a.y - b.y) || (a.x - b.x))

  const renderWidgetCard = (item: LayoutItem, mobile = false) => {
    const widgetId = item.i.split('-')[0]
    const meta = WIDGET_MAP[widgetId]
    if (!meta) return null
    const Comp = meta.component
    const mobileHeight = MOBILE_WIDGET_HEIGHTS[widgetId] ?? Math.max(170, Math.min(320, meta.defaultH * 42))
    return (
      <div key={item.i} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 8, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', position: 'relative',
        height: mobile ? mobileHeight : '100%',
        minWidth: 0,
      }}>
        {meta.hideHeaderLabel ? (
          meta.Actions && (
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
              <meta.Actions />
            </div>
          )
        ) : (
          <div style={{
            padding: mobile ? '9px 12px 7px' : '10px 14px 8px',
            fontSize: mobile ? 12 : 13, fontWeight: 600,
            color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              minWidth: 0, whiteSpace: 'nowrap',
            }}>
              <span style={{ flexShrink: 0 }}>{meta.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.name}</span>
            </div>
            {meta.Actions && (
              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                <meta.Actions />
              </div>
            )}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Comp />
          </div>
        </div>
      </div>
    )
  }

  const changeScale = (next: number) => {
    const value = normalizeUiScale(next)
    setUiScale(value)
    saveWithOverrides({ uiScale: value })
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="나만의 플래너"
        description="오늘의 실행, 일정과 기록을 한눈에 확인합니다."
        actions={<>
          <div className="dashboard-scale-control">
            <IconButton
              label="화면 비율 5% 축소"
              icon={<Minus size={15} />}
              size="sm"
              onClick={() => changeScale(uiScale - 5)}
              disabled={uiScale <= UI_SCALE_MIN}
            />
            <select
              value={uiScale}
              onChange={event => changeScale(Number(event.target.value))}
              aria-label="화면 비율"
            >
              {UI_SCALE_OPTIONS.map(value => (
                <option key={value} value={value}>{value}%</option>
              ))}
            </select>
            <IconButton
              label="화면 비율 5% 확대"
              icon={<Plus size={15} />}
              size="sm"
              onClick={() => changeScale(uiScale + 5)}
              disabled={uiScale >= UI_SCALE_MAX}
            />
          </div>
          <Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => setIsEditing(true)}>편집</Button>
        </>}
      />

      <div ref={containerRef} style={{ width: '100%' }}>
        {containerW > 0 && layout.length > 0 && isMobileDashboard && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 12, width: '100%',
          }}>
            {orderedLayout.map(item => renderWidgetCard(item, true))}
          </div>
        )}

        {containerW > 0 && layout.length > 0 && !isMobileDashboard && (
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
              return renderWidgetCard(item)
            })}
          </GridLayout>
        )}

        {layout.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 300, color: 'var(--muted)', gap: 12,
          }}>
            <LayoutDashboard size={36} aria-hidden="true" />
            <p>위젯이 없습니다. 편집 버튼을 눌러 위젯을 추가해보세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}

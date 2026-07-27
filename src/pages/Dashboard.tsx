import { useEffect, useRef, useState } from 'react'
import DashboardGridCanvas, {
  buildDashboardGridLayout,
  deriveRegisteredTabletDashboardLayout,
} from '../components/DashboardGridCanvas'
import DashboardWidgetCard from '../components/DashboardWidgetCard'
import { useApp } from '../store/AppContext'
import {
  getDashboardViewportMode,
  normalizeDashboardMobile,
} from '../utils/dashboardLayout'
import { resolveDisplayScale } from '../utils/responsiveUi'
import { WIDGET_MAP } from '../widgets'
import DashboardEditor from './DashboardEditor'
import './dashboard.css'

export default function Dashboard() {
  const {
    dashboardConfig,
    uiScale,
    setUiScale,
    saveWithOverrides,
    displayPreferences,
    setDisplayPreferences,
    dashboardEditRequestKey,
    consumeDashboardEditRequest,
  } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [focusEditorHeading, setFocusEditorHeading] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1200 : window.innerWidth,
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (dashboardEditRequestKey <= 0) return
    setFocusEditorHeading(true)
    setIsEditing(true)
    consumeDashboardEditRequest()
  }, [dashboardEditRequestKey, consumeDashboardEditRequest])

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = () => setContainerWidth(element.offsetWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    try {
      observer.observe(element, { box: 'border-box' })
    } catch {
      observer.observe(element)
    }
    return () => observer.disconnect()
  }, [isEditing])

  if (isEditing) {
    return (
      <DashboardEditor
        focusHeading={focusEditorHeading}
        onDone={() => {
          setIsEditing(false)
          setFocusEditorHeading(false)
        }}
      />
    )
  }

  const viewportMode = getDashboardViewportMode(viewportWidth)
  const gridMode = viewportMode === 'phone' ? null : viewportMode
  const validActiveIds = dashboardConfig.activeIds.filter(
    instanceId => WIDGET_MAP[instanceId.split('-')[0]],
  )
  const gridSource = gridMode === 'tablet'
    ? dashboardConfig.tablet?.layout
      ?? deriveRegisteredTabletDashboardLayout(
        dashboardConfig.desktop.layout,
        validActiveIds,
      )
    : dashboardConfig.desktop.layout
  const gridLayout = gridMode
    ? buildDashboardGridLayout(validActiveIds, gridSource, gridMode)
    : []
  const desktopOrder = dashboardConfig.desktop.layout
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => validActiveIds.includes(item.i))
    .sort((first, second) =>
      first.item.y - second.item.y
      || first.item.x - second.item.x
      || first.index - second.index,
    )
    .map(({ item }) => item.i)
  validActiveIds.forEach(instanceId => {
    if (!desktopOrder.includes(instanceId)) desktopOrder.push(instanceId)
  })
  const mobileProfile = normalizeDashboardMobile(
    dashboardConfig.mobile,
    desktopOrder,
  )
  const hiddenMobileIds = new Set(mobileProfile.hidden)
  const visibleMobileIds = mobileProfile.order.filter(id => !hiddenMobileIds.has(id))

  const scaleControlValue = resolveDisplayScale({
    viewportWidth,
    densityMode: displayPreferences.densityMode,
    manualScale: uiScale,
  })

  const changeScale = (next: number) => {
    const value = Math.min(110, Math.max(80, Math.round(next / 5) * 5))
    const nextDisplayPreferences = {
      densityMode: 'manual' as const,
      updatedAt: new Date().toISOString(),
    }
    setUiScale(value)
    setDisplayPreferences(nextDisplayPreferences)
    void saveWithOverrides({
      uiScale: value,
      displayPreferences: nextDisplayPreferences,
    })
  }

  const openEditor = (focusHeading = false) => {
    setFocusEditorHeading(focusHeading)
    setIsEditing(true)
  }

  const hasVisibleWidgets = viewportMode === 'phone'
    ? visibleMobileIds.length > 0
    : gridLayout.length > 0

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2>나만의 플래너</h2>
        <div className="dashboard-header-actions">
          <div className="dashboard-scale-control" style={{
            display: 'flex',
            alignItems: 'center',
            height: 34,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--bg2)',
          }}>
            <button
              type="button"
              onClick={() => changeScale(scaleControlValue - 5)}
              disabled={scaleControlValue <= 80}
              title="화면 축소"
              aria-label="화면 축소"
              style={{
                width: 32,
                height: '100%',
                border: 0,
                background: 'transparent',
                color: 'var(--muted)',
                fontSize: 17,
                cursor: scaleControlValue <= 80 ? 'default' : 'pointer',
                opacity: scaleControlValue <= 80 ? 0.35 : 1,
              }}
            >
              −
            </button>
            <select
              value={displayPreferences.densityMode === 'auto' ? 'auto' : scaleControlValue}
              onChange={event => {
                if (event.target.value !== 'auto') changeScale(Number(event.target.value))
              }}
              aria-label="화면 비율"
              style={{
                height: '100%',
                border: 0,
                borderLeft: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 12,
                fontWeight: 600,
                padding: '0 6px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="auto" disabled>자동 90%</option>
              {[80, 85, 90, 95, 100, 105, 110].map(value => (
                <option key={value} value={value}>{value}%</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => changeScale(scaleControlValue + 5)}
              disabled={scaleControlValue >= 110}
              title="화면 확대"
              aria-label="화면 확대"
              style={{
                width: 32,
                height: '100%',
                border: 0,
                background: 'transparent',
                color: 'var(--muted)',
                fontSize: 17,
                cursor: scaleControlValue >= 110 ? 'default' : 'pointer',
                opacity: scaleControlValue >= 110 ? 0.35 : 1,
              }}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="dashboard-secondary-button"
            onClick={() => openEditor(false)}
          >
            편집
          </button>
        </div>
      </div>

      <div ref={containerRef} className="dashboard-canvas-shell">
        {containerWidth > 0 && viewportMode === 'phone' && visibleMobileIds.length > 0 && (
          <div className="mobile-dashboard-list">
            {visibleMobileIds.map(instanceId => (
              <DashboardWidgetCard
                key={instanceId}
                instanceId={instanceId}
                mobile
              />
            ))}
          </div>
        )}

        {containerWidth > 0 && gridMode && gridLayout.length > 0 && (
          <DashboardGridCanvas
            layout={gridLayout}
            width={containerWidth}
            mode={gridMode}
          />
        )}

        {!hasVisibleWidgets && (
          <div className="dashboard-empty">
            <span className="dashboard-empty-icon" aria-hidden="true">📋</span>
            <p>
              {viewportMode === 'phone' && validActiveIds.length > 0
                ? '휴대폰에 표시할 위젯을 선택해주세요.'
                : '위젯이 없습니다. 편집 버튼을 눌러 위젯을 추가해보세요.'}
            </p>
            <button
              type="button"
              className="dashboard-primary-button"
              onClick={() => openEditor(true)}
            >
              위젯 편집
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

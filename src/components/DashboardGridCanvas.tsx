import { type ComponentProps, forwardRef, memo } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { DashboardGridMode, LayoutItem } from '../types'
import {
  DASHBOARD_GRID_COLUMNS,
  DASHBOARD_GRID_GAP,
  DASHBOARD_GRID_ROW_HEIGHT,
  deriveTabletDashboardLayout,
  normalizeDashboardLayout,
} from '../utils/dashboardLayout'
import { WIDGET_MAP } from '../widgets'
import DashboardWidgetCard from './DashboardWidgetCard'

type GridLayoutProps = ComponentProps<typeof GridLayout>

export const getDashboardWidgetGridSize = (
  widgetId: string,
  mode: DashboardGridMode,
) => {
  const meta = WIDGET_MAP[widgetId]
  if (!meta) return null

  if (mode === 'desktop') {
    return {
      defaultW: meta.defaultW,
      defaultH: meta.defaultH * 2,
      minW: meta.minW,
      minH: meta.minH * 2,
    }
  }

  const tablet = meta.tablet
  const minW = tablet?.minW ?? Math.max(7, Math.ceil(meta.minW / 2))
  return {
    defaultW: tablet?.defaultW ?? Math.max(10, Math.ceil(meta.defaultW / 2)),
    defaultH: meta.defaultH * 2,
    minW,
    minH: meta.minH * 2,
  }
}

export const deriveRegisteredTabletDashboardLayout = (
  desktopLayout: readonly LayoutItem[],
  activeIds?: readonly string[],
): LayoutItem[] => {
  const activeSet = activeIds ? new Set(activeIds) : null
  const visibleDesktopLayout = desktopLayout.filter(item =>
    WIDGET_MAP[item.i.split('-')[0]]
    && (!activeSet || activeSet.has(item.i)),
  )

  return deriveTabletDashboardLayout(visibleDesktopLayout, instanceId => {
    const widgetId = instanceId.split('-')[0]
    return getDashboardWidgetGridSize(widgetId, 'tablet')?.minW
  })
}

export const buildDashboardGridLayout = (
  activeIds: readonly string[],
  sourceLayout: readonly LayoutItem[],
  mode: DashboardGridMode,
): LayoutItem[] => {
  const activeSet = new Set(activeIds)
  const visibleSource = sourceLayout.filter(item => activeSet.has(item.i))
  const sourceById = new Map(visibleSource.map(item => [item.i, item]))
  const bottom = visibleSource.reduce(
    (maximum, item) => Math.max(maximum, item.y + item.h),
    0,
  )
  let nextBottom = bottom

  const layout = activeIds.flatMap(instanceId => {
    const widgetId = instanceId.split('-')[0]
    const size = getDashboardWidgetGridSize(widgetId, mode)
    if (!size) return []

    const saved = sourceById.get(instanceId)
    if (saved) {
      return [{
        ...saved,
        minW: size.minW,
        minH: size.minH,
        w: Math.max(saved.w, size.minW),
        h: Math.max(saved.h, size.minH),
      }]
    }

    const item: LayoutItem = {
      i: instanceId,
      x: 0,
      y: nextBottom,
      w: size.defaultW,
      h: size.defaultH,
      minW: size.minW,
      minH: size.minH,
    }
    nextBottom += item.h
    return [item]
  })

  return normalizeDashboardLayout(layout, mode)
}

interface DashboardGridCanvasProps {
  layout: LayoutItem[]
  width: number
  mode: DashboardGridMode
  editable?: boolean
  interactionDisabled?: boolean
  transformScale?: number
  onRemove?: (instanceId: string) => void
  onDragStart?: GridLayoutProps['onDragStart']
  onDrag?: GridLayoutProps['onDrag']
  onDragStop?: GridLayoutProps['onDragStop']
  onResizeStart?: GridLayoutProps['onResizeStart']
  onResize?: GridLayoutProps['onResize']
  onResizeStop?: GridLayoutProps['onResizeStop']
}

const DashboardGridCanvas = memo(forwardRef<HTMLDivElement, DashboardGridCanvasProps>(
  function DashboardGridCanvas({
    layout,
    width,
    mode,
    editable = false,
    interactionDisabled = false,
    transformScale = 1,
    onRemove,
    onDragStart,
    onDrag,
    onDragStop,
    onResizeStart,
    onResize,
    onResizeStop,
  }, ref) {
    const canInteract = editable && !interactionDisabled
    return (
      <div ref={ref} className="dashboard-canvas-shell">
        <GridLayout
          key={mode}
          layout={layout}
          cols={DASHBOARD_GRID_COLUMNS[mode]}
          rowHeight={DASHBOARD_GRID_ROW_HEIGHT}
          width={width}
          margin={[DASHBOARD_GRID_GAP, DASHBOARD_GRID_GAP]}
          containerPadding={[0, 0]}
          compactType={null}
          allowOverlap={false}
          preventCollision={editable}
          isDraggable={canInteract}
          isResizable={canInteract}
          isBounded={false}
          useCSSTransforms
          transformScale={transformScale}
          draggableHandle=".dashboard-drag-handle"
          resizeHandles={canInteract ? ['se', 'sw', 's', 'e', 'w'] : []}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
        >
          {layout.map(item => (
            <div key={item.i}>
              <DashboardWidgetCard
                instanceId={item.i}
                editing={editable}
                interactionDisabled={interactionDisabled}
                onRemove={onRemove}
              />
            </div>
          ))}
        </GridLayout>
      </div>
    )
  },
))

export default DashboardGridCanvas

import { memo } from 'react'
import { WIDGET_MAP } from '../widgets'

interface DashboardWidgetCardProps {
  instanceId: string
  mobile?: boolean
  editing?: boolean
  interactionDisabled?: boolean
  onRemove?: (instanceId: string) => void
}

function DashboardWidgetCardComponent({
  instanceId,
  mobile = false,
  editing = false,
  interactionDisabled = false,
  onRemove,
}: DashboardWidgetCardProps) {
  const widgetId = instanceId.split('-')[0]
  const meta = WIDGET_MAP[widgetId]
  if (!meta) return null

  const Comp = meta.component
  const mobileHeight = meta.mobileHeight

  return (
    <div
      className={`dashboard-grid-card${mobile ? ' is-mobile' : ''}${editing ? ' is-editing' : ''}`}
      style={mobile ? { height: mobileHeight } : undefined}
    >
      {editing ? (
        <div className="dashboard-drag-handle">
          <span className="dashboard-drag-label">
            <span aria-hidden="true">⠿⠿</span>
            <span aria-hidden="true">{meta.icon}</span>
            <span>{meta.name}</span>
          </span>
          <button
            type="button"
            className="dashboard-remove-widget"
            disabled={interactionDisabled}
            aria-label={`${meta.name} 위젯 삭제`}
            title="위젯 삭제"
            onPointerDown={event => event.stopPropagation()}
            onTouchStart={event => event.stopPropagation()}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation()
              onRemove?.(instanceId)
            }}
          >
            ✕
          </button>
        </div>
      ) : meta.hideHeaderLabel ? (
        meta.Actions && (
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
            <meta.Actions />
          </div>
        )
      ) : (
        <div className="dashboard-widget-heading">
          <div className="dashboard-widget-title">
            <span aria-hidden="true">{meta.icon}</span>
            <span>{meta.name}</span>
          </div>
          {meta.Actions && (
            <div className="dashboard-widget-actions">
              <meta.Actions />
            </div>
          )}
        </div>
      )}

      <div
        className="dashboard-widget-body"
        style={editing ? { pointerEvents: 'none' } : undefined}
      >
        <div className="dashboard-widget-content">
          <Comp />
        </div>
      </div>
    </div>
  )
}

export default memo(DashboardWidgetCardComponent)

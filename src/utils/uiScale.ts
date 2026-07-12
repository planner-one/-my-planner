export const UI_SCALE_MIN = 80
export const UI_SCALE_MAX = 110
export const UI_SCALE_STEP = 5
export const DEFAULT_UI_SCALE = 90
export const UI_SCALE_OPTIONS = [80, 85, 90, 95, 100, 105, 110] as const

export interface UiScaleMetrics {
  value: number
  factor: number
  viewportPercent: number
}

export function normalizeUiScale(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim()
      ? Number(value)
      : Number.NaN
  if (!Number.isFinite(parsed)) return DEFAULT_UI_SCALE

  const stepped = Math.round(parsed / UI_SCALE_STEP) * UI_SCALE_STEP
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, stepped))
}

export function getUiScaleMetrics(value: unknown): UiScaleMetrics {
  const normalized = normalizeUiScale(value)
  const factor = normalized / 100
  return {
    value: normalized,
    factor,
    viewportPercent: Number((100 / factor).toFixed(6)),
  }
}

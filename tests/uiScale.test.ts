import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UI_SCALE,
  getUiScaleMetrics,
  normalizeUiScale,
} from '../src/utils/uiScale'

describe('uiScale', () => {
  it('normalizes invalid and out-of-range values to supported steps', () => {
    expect(normalizeUiScale(undefined)).toBe(DEFAULT_UI_SCALE)
    expect(normalizeUiScale(72)).toBe(80)
    expect(normalizeUiScale(88)).toBe(90)
    expect(normalizeUiScale(118)).toBe(110)
  })

  it('returns inverse viewport dimensions for visual scaling', () => {
    expect(getUiScaleMetrics(80)).toEqual({
      value: 80,
      factor: 0.8,
      viewportPercent: 125,
    })
    expect(getUiScaleMetrics(110)).toEqual({
      value: 110,
      factor: 1.1,
      viewportPercent: 90.909091,
    })
  })
})

import {
  DEFAULT_MOBILE_BOTTOM_TABS,
  MOBILE_BOTTOM_TAB_LIMIT,
  moveMobileBottomTab,
  type MobileBottomTabId,
} from '../utils/responsiveUi'

interface MobileNavigationOption {
  id: MobileBottomTabId
  label: string
  groupLabel: string
}

interface MobileNavigationEditorProps {
  value: MobileBottomTabId[]
  options: MobileNavigationOption[]
  onChange: (value: MobileBottomTabId[]) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string
}

export default function MobileNavigationEditor({
  value,
  options,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: MobileNavigationEditorProps) {
  const selectedOptions = value
    .map(id => options.find(option => option.id === id))
    .filter((option): option is MobileNavigationOption => Boolean(option))
  const availableOptions = options.filter(option => !value.includes(option.id))
  const availableGroups = Array.from(new Set(availableOptions.map(option => option.groupLabel)))
  const remainingCount = Math.max(0, MOBILE_BOTTOM_TAB_LIMIT - value.length)
  const selectionComplete = value.length === MOBILE_BOTTOM_TAB_LIMIT

  const addItem = (id: MobileBottomTabId) => {
    if (saving || value.length >= MOBILE_BOTTOM_TAB_LIMIT || value.includes(id)) return
    onChange([...value, id])
  }

  const removeItem = (id: MobileBottomTabId) => {
    if (saving) return
    onChange(value.filter(item => item !== id))
  }

  return (
    <div className="mobile-navigation-editor">
      <div className="mobile-navigation-editor-intro">
        <p>홈은 첫 번째 칸에 고정됩니다. 뒤에 표시할 바로가기 네 개를 선택해주세요.</p>
        <button
          type="button"
          onClick={() => onChange([...DEFAULT_MOBILE_BOTTOM_TABS])}
          disabled={saving}
        >
          초기화
        </button>
      </div>

      <section className="mobile-navigation-editor-section" aria-labelledby="mobile-selected-navigation-title">
        <div className="mobile-navigation-editor-title">
          <h3 id="mobile-selected-navigation-title">선택한 바로가기</h3>
          <span>{value.length}/{MOBILE_BOTTOM_TAB_LIMIT}</span>
        </div>
        <ol className="mobile-navigation-editor-selected">
          {selectedOptions.map((option, index) => (
            <li key={option.id}>
              <span className="mobile-navigation-editor-order" aria-hidden="true">{index + 2}</span>
              <span className="mobile-navigation-editor-label">{option.label}</span>
              <div className="mobile-navigation-editor-row-actions">
                <button
                  type="button"
                  onClick={() => onChange(moveMobileBottomTab(value, option.id, 'up'))}
                  disabled={saving || index === 0}
                  aria-label={`${option.label} 위로 이동`}
                >
                  위로
                </button>
                <button
                  type="button"
                  onClick={() => onChange(moveMobileBottomTab(value, option.id, 'down'))}
                  disabled={saving || index === value.length - 1}
                  aria-label={`${option.label} 아래로 이동`}
                >
                  아래로
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(option.id)}
                  disabled={saving}
                  aria-label={`${option.label} 제거`}
                >
                  제거
                </button>
              </div>
            </li>
          ))}
        </ol>
        <p className="mobile-navigation-editor-status" role="status" aria-live="polite">
          {selectionComplete
            ? '바로가기 네 개를 모두 선택했습니다. 다른 페이지를 추가하려면 먼저 하나를 제거해주세요.'
            : `바로가기를 ${remainingCount}개 더 선택해주세요.`}
        </p>
      </section>

      <section className="mobile-navigation-editor-section" aria-labelledby="mobile-available-navigation-title">
        <div className="mobile-navigation-editor-title">
          <h3 id="mobile-available-navigation-title">추가할 페이지</h3>
        </div>
        <div className="mobile-navigation-editor-options">
          {availableGroups.map(groupLabel => (
            <div key={groupLabel} className="mobile-navigation-editor-group">
              <h4>{groupLabel}</h4>
              <div>
                {availableOptions
                  .filter(option => option.groupLabel === groupLabel)
                  .map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => addItem(option.id)}
                      disabled={saving || selectionComplete}
                      aria-label={`${option.label} 추가`}
                    >
                      <span>{option.label}</span>
                      <strong>추가</strong>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="mobile-navigation-editor-error" role="alert">{error}</p>}

      <div className="mobile-navigation-editor-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button
          type="button"
          className="primary"
          onClick={onSave}
          disabled={saving || !selectionComplete}
        >
          {saving ? '저장 중…' : '완료'}
        </button>
      </div>
    </div>
  )
}

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Planner render failed.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="startup-error" role="alert">
          <div className="startup-error-panel">
            <span className="startup-error-mark" aria-hidden="true">!</span>
            <h1>화면을 불러오지 못했습니다</h1>
            <p>작성 중인 데이터는 자동 저장 상태를 확인한 뒤 다시 불러와 주세요.</p>
            <button type="button" onClick={() => window.location.reload()}>
              <RefreshCw size={16} aria-hidden="true" />
              다시 불러오기
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

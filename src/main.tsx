import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('ROOT_ELEMENT_MISSING')

const root = ReactDOM.createRoot(rootElement)

function StartupError() {
  return (
    <main className="startup-error" role="alert">
      <div className="startup-error-panel">
        <span className="startup-error-mark" aria-hidden="true">!</span>
        <h1>플래너를 시작하지 못했습니다</h1>
        <p>앱 설정을 확인한 뒤 다시 시도해 주세요.</p>
        <button type="button" onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    </main>
  )
}

async function bootstrap() {
  try {
    const { default: App } = await import('./App')
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('Planner startup failed.', error)
    root.render(<StartupError />)
  }
}

void bootstrap()

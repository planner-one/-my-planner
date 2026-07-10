import { useState } from 'react'
import { LayoutDashboard, LoaderCircle } from 'lucide-react'
import { getLocalhostAuthUrl, signInWithGoogle } from '../services/authService'

const getLoginErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : ''
  const message = error instanceof Error ? error.message : ''
  const reason = `${code} ${message}`

  if (reason.includes('popup-closed-by-user')) return ''
  if (reason.includes('unauthorized-domain')) {
    return 'Firebase Auth 승인 도메인 문제가 있어요. 로컬에서는 localhost 주소로 다시 시도해주세요.'
  }
  if (reason.includes('popup-blocked')) {
    return '브라우저가 로그인 팝업을 막았어요. 팝업 허용 후 다시 시도해주세요.'
  }
  return code
    ? `로그인에 실패했습니다. 오류 코드: ${code}`
    : '로그인에 실패했습니다. 다시 시도해주세요.'
}

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleLogin = async () => {
    const localhostUrl = getLocalhostAuthUrl(window.location.href)
    if (localhostUrl) {
      window.location.replace(localhostUrl)
      return
    }

    setErrorMessage('')
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (e: unknown) {
      setErrorMessage(getLoginErrorMessage(e))
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            <LayoutDashboard size={22} />
          </span>
          <div>
            <h1 id="login-title">나만의 플래너</h1>
          </div>
        </div>
        <p>계획, 기회, 기록을 한 계정에서 이어서 관리하세요.</p>
        <button className="login-button" type="button" onClick={handleLogin} disabled={isSigningIn}>
          {isSigningIn ? (
            <LoaderCircle className="ui-spin" size={20} aria-hidden="true" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20} height={20} alt="" />
          )}
          {isSigningIn ? '로그인 확인 중' : 'Google로 계속하기'}
        </button>
        {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}
        <div className="login-meta">Firebase로 안전하게 동기화됩니다.</div>
      </section>
    </main>
  )
}

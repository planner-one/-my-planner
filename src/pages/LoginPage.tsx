import { useState } from 'react'
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
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 'var(--app-viewport-height)', gap: 24,
      background: 'var(--bg)', color: 'var(--text)',
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>나만의 플래너</h1>
      <p style={{ color: 'var(--muted)' }}>
        구글 계정으로 로그인하면 어디서든 동일한 데이터를 사용할 수 있습니다.
      </p>
      <button onClick={handleLogin} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 24px', borderRadius: 8, border: '1px solid var(--border)',
        background: 'var(--bg2)', color: 'var(--text)', fontSize: 15,
        cursor: isSigningIn ? 'wait' : 'pointer', fontWeight: 500,
        opacity: isSigningIn ? 0.72 : 1,
      }}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20} alt="Google" />
        {isSigningIn ? '로그인 확인 중...' : 'Google로 계속하기'}
      </button>
      {errorMessage && (
        <p style={{
          maxWidth: 420,
          margin: 0,
          color: '#d84848',
          fontSize: 13,
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          {errorMessage}
        </p>
      )}
    </div>
  )
}

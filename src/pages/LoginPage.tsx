import { signInWithGoogle } from '../services/authService'

export default function LoginPage() {
  const handleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (e: unknown) {
      if (e instanceof Error && !e.message.includes('popup-closed-by-user')) {
        alert('로그인에 실패했습니다. 다시 시도해주세요.')
      }
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: 24,
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
        cursor: 'pointer', fontWeight: 500,
      }}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20} alt="Google" />
        Google로 계속하기
      </button>
    </div>
  )
}

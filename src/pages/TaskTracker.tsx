export default function TaskTracker() {
  return (
    <div style={{ maxWidth: 920, margin: '0 auto', color: 'var(--text)' }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>작업 관리</h1>
      <p style={{ margin: '5px 0 20px', color: 'var(--muted)', fontSize: 13 }}>
        마감일, 우선순위, 상태와 담당자를 기준으로 장기 작업을 관리하는 페이지입니다.
      </p>
      <div style={{
        padding: '36px 18px', border: '1px solid var(--border)',
        borderRadius: 10, background: 'var(--bg2)',
        color: 'var(--muted)', fontSize: 13, textAlign: 'center',
      }}>
        작업 관리 기능을 준비 중입니다.
      </div>
    </div>
  )
}

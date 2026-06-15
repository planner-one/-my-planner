export default function PrintPlanner() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 20, textAlign: 'center',
    }}>
      <div style={{ fontSize: 52 }}>🖨️</div>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 8 }}>
          오프라인 플래너 양식
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
          원하는 양식을 선택해 나만의 플래너를 출력·구매할 수 있는 서비스입니다.
        </p>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 18px', borderRadius: 20,
        background: 'var(--accent-soft)', border: '1px solid var(--accent)',
        fontSize: 13, fontWeight: 600, color: 'var(--accent)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        서비스 오픈 준비 중
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
        곧 만나보실 수 있어요. 조금만 기다려 주세요 :)
      </p>
    </div>
  )
}

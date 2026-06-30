import { useAuth } from '../store/AuthContext'
import { useApp } from '../store/AppContext'
import { APP_RELEASE_DATE, APP_RELEASE_NAME, APP_RELEASE_NOTES, APP_VERSION } from '../version'

export default function ProfilePage() {
  const { user } = useAuth()
  const {
    nickname, setNickname,
    uiScale, setUiScale,
    todos, habits, goals, projects, notes, journal,
    scheduledTasks, careerEvents, dashboardActive, dashboardLayout,
    saveNow,
  } = useApp()

  const displayName = nickname.trim() || user?.displayName || '플래너 사용자'
  const storageItems = [
    { label: 'Todo', value: todos.length },
    { label: '루틴', value: habits.length },
    { label: '목표', value: goals.length },
    { label: '프로젝트', value: projects.length },
    { label: '노트', value: notes.length },
    { label: '저널', value: journal.length },
    { label: '예정', value: scheduledTasks.length },
    { label: '신청', value: careerEvents.length },
  ]

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-avatar">
          {user?.photoURL ? <img src={user.photoURL} alt="프로필" /> : <span>{displayName[0]?.toUpperCase() ?? '?'}</span>}
        </div>
        <div>
          <h2>{displayName}</h2>
          <p>{user?.email ?? '로그인 계정 정보 없음'}</p>
        </div>
      </header>

      <section className="profile-grid">
        <article className="profile-panel">
          <h3>기본 정보</h3>
          <label>
            <span>표시 이름</span>
            <input value={nickname} onChange={event => setNickname(event.target.value)} placeholder={user?.displayName ?? '닉네임'} />
          </label>
          <label>
            <span>화면 밀도</span>
            <div className="scale-row">
              <input
                type="range"
                min={80}
                max={110}
                step={5}
                value={uiScale}
                onChange={event => setUiScale(Number(event.target.value))}
              />
              <b>{uiScale}%</b>
            </div>
          </label>
          <button type="button" className="primary-button" onClick={() => void saveNow()}>
            지금 저장
          </button>
        </article>

        <article className="profile-panel">
          <h3>대시보드</h3>
          <div className="profile-stats">
            <Stat label="활성 위젯" value={dashboardActive.length} />
            <Stat label="레이아웃 항목" value={dashboardLayout.length} />
            <Stat label="테마" value={document.documentElement.getAttribute('data-theme') || 'light'} />
          </div>
          <p className="profile-note">테마는 현재 브라우저에 저장되고, 화면 밀도와 플래너 데이터는 Firestore 저장 흐름을 사용합니다.</p>
        </article>
      </section>

      <section className="profile-panel">
        <div className="panel-heading">
          <h3>데이터 현황</h3>
          <span>Firestore 사용자 데이터</span>
        </div>
        <div className="storage-grid">
          {storageItems.map(item => <Stat key={item.label} label={item.label} value={item.value} />)}
        </div>
      </section>

      <section className="profile-panel release-panel">
        <div className="panel-heading">
          <div>
            <h3>플래너 버전</h3>
            <p className="profile-note">현재 앱 기준과 이번 릴리즈에 포함된 핵심 업그레이드입니다.</p>
          </div>
          <span className="version-badge">v{APP_VERSION}</span>
        </div>
        <div className="release-summary">
          <Stat label="릴리즈" value={APP_RELEASE_NAME} />
          <Stat label="배포 기준일" value={APP_RELEASE_DATE} />
        </div>
        <ul className="release-list">
          {APP_RELEASE_NOTES.map(note => <li key={note}>{note}</li>)}
        </ul>
      </section>

      <style>{`
        .profile-page { max-width: 960px; margin: 0 auto; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
        .profile-header { display: flex; align-items: center; gap: 14px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
        .profile-avatar { width: 58px; height: 58px; border-radius: 18px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; overflow: hidden; flex-shrink: 0; font-size: 24px; font-weight: 900; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-header h2 { margin: 0 0 5px; font-size: 24px; letter-spacing: 0; }
        .profile-header p { margin: 0; color: var(--muted); font-size: 13px; }
        .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .profile-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 13px; }
        .profile-panel h3 { margin: 0; font-size: 15px; }
        .profile-panel label { display: flex; flex-direction: column; gap: 6px; }
        .profile-panel label span, .panel-heading span, .profile-note { color: var(--muted); font-size: 12px; line-height: 1.5; }
        .profile-panel input[type="text"], .profile-panel input:not([type]) { height: 36px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg3); color: var(--text); padding: 0 10px; font-size: 13px; outline: none; }
        .scale-row { display: grid; grid-template-columns: minmax(0, 1fr) 52px; gap: 10px; align-items: center; }
        .scale-row b { color: var(--accent); font-size: 13px; text-align: right; }
        .primary-button { height: 36px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; padding: 0 13px; font-size: 12px; font-weight: 800; cursor: pointer; align-self: flex-start; }
        .profile-stats, .storage-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
        .storage-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .stat-card { border: 1px solid var(--border); border-radius: 8px; background: var(--bg3); padding: 12px; min-width: 0; }
        .stat-card span { display: block; color: var(--muted); font-size: 11px; font-weight: 700; }
        .stat-card b { display: block; margin-top: 6px; color: var(--text); font-size: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .panel-heading { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .version-badge { flex-shrink: 0; border: 1px solid var(--accent); border-radius: 999px; background: var(--accent-soft); color: var(--accent); padding: 5px 10px; font-size: 12px; font-weight: 900; }
        .release-panel .panel-heading { align-items: flex-start; }
        .release-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
        .release-summary .stat-card b { font-size: 16px; }
        .release-list { margin: 0; padding-left: 18px; color: var(--text); font-size: 13px; line-height: 1.7; }
        .release-list li::marker { color: var(--accent); }
        @media (max-width: 760px) {
          .profile-grid, .profile-stats, .storage-grid, .release-summary { grid-template-columns: 1fr; }
          .profile-header { align-items: flex-start; }
          .release-panel .panel-heading { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <b>{value}</b>
    </article>
  )
}

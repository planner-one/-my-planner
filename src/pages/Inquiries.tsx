import { useEffect, useState } from 'react'
import { useAuth } from '../store/AuthContext'
import {
  answerInquiry,
  createInquiry,
  subscribeToInquiries,
  type Inquiry,
  type InquiryCategory,
} from '../services/inquiryService'
import { isAdminEmail } from '../utils/adminAccess'

const CATEGORY_LABELS: Record<InquiryCategory, string> = {
  usage: '이용 문의',
  bug: '오류 신고',
  suggestion: '기능 제안',
  other: '기타',
}

function formatDate(value: Inquiry['createdAt']) {
  if (!value) return '방금 전'
  return value.toDate().toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Inquiries() {
  const { user } = useAuth()
  const [admin, setAdmin] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [items, setItems] = useState<Inquiry[]>([])
  const [category, setCategory] = useState<InquiryCategory>('usage')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    isAdminEmail(user?.email).then(result => {
      if (!active) return
      setAdmin(result)
      setAuthChecked(true)
    })
    return () => { active = false }
  }, [user?.email])

  useEffect(() => {
    if (!user || !authChecked) return
    setError('')
    return subscribeToInquiries(user.uid, admin, setItems, setError)
  }, [user, admin, authChecked])

  useEffect(() => {
    setAnswers(current => {
      const next = { ...current }
      items.forEach(item => {
        if (next[item.id] === undefined) next[item.id] = item.answer ?? ''
      })
      return next
    })
  }, [items])

  const submit = async () => {
    const cleanTitle = title.trim()
    const cleanContent = content.trim()
    if (!user || !cleanTitle || !cleanContent || submitting) return

    setSubmitting(true)
    setError('')
    try {
      await createInquiry({
        userId: user.uid,
        userName: user.displayName ?? '사용자',
        userEmail: user.email ?? '',
        category,
        title: cleanTitle,
        content: cleanContent,
      })
      setTitle('')
      setContent('')
      setCategory('usage')
      setMessage('문의가 등록되었습니다.')
      window.setTimeout(() => setMessage(''), 2500)
    } catch {
      setError('문의를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveAnswer = async (item: Inquiry) => {
    const answer = (answers[item.id] ?? '').trim()
    if (!answer || savingId) return

    setSavingId(item.id)
    setError('')
    try {
      await answerInquiry(item.id, answer)
      setMessage('답변을 저장했습니다.')
      window.setTimeout(() => setMessage(''), 2500)
    } catch {
      setError('답변을 저장하지 못했습니다. 관리자 권한과 보안 규칙을 확인해 주세요.')
    } finally {
      setSavingId(null)
    }
  }

  if (!user) return null

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', color: 'var(--text)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 16, marginBottom: 20,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>문의 게시판</h1>
          <p style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            {admin ? '등록된 문의를 확인하고 답변할 수 있습니다.' : '궁금한 점이나 불편한 내용을 남겨 주세요.'}
          </p>
        </div>
        {admin && (
          <span style={{
            padding: '5px 9px', borderRadius: 6,
            background: 'var(--bg3)', color: 'var(--accent)',
            fontSize: 11, fontWeight: 700,
          }}>
            관리자
          </span>
        )}
      </div>

      {(message || error) && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 8,
          background: error ? 'rgba(224,82,82,0.1)' : 'var(--bg3)',
          color: error ? 'var(--red)' : 'var(--accent)', fontSize: 12,
        }}>
          {error || message}
        </div>
      )}

      {!admin && (
        <section style={{
          padding: 18, marginBottom: 20, borderRadius: 10,
          background: 'var(--bg2)', border: '1px solid var(--border)',
        }}>
          <div
            className="inquiry-form-grid"
            style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8, marginBottom: 8 }}
          >
            <select
              value={category}
              onChange={event => setCategory(event.target.value as InquiryCategory)}
              style={{
                minWidth: 0, padding: '9px 10px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg3)',
                color: 'var(--text)', fontSize: 13,
              }}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              value={title}
              maxLength={80}
              onChange={event => setTitle(event.target.value)}
              placeholder="문의 제목"
              style={{
                minWidth: 0, padding: '9px 11px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg3)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <textarea
            value={content}
            maxLength={2000}
            onChange={event => setContent(event.target.value)}
            placeholder="문의 내용을 입력해 주세요."
            style={{
              width: '100%', minHeight: 120, resize: 'vertical', boxSizing: 'border-box',
              padding: 11, borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg3)', color: 'var(--text)', fontSize: 13,
              fontFamily: 'inherit', lineHeight: 1.6, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>{content.length}/2000</span>
            <button
              type="button"
              onClick={submit}
              disabled={!title.trim() || !content.trim() || submitting}
              style={{
                padding: '8px 16px', border: 'none', borderRadius: 7,
                background: 'var(--accent)', color: '#fff', fontSize: 13,
                fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                opacity: !title.trim() || !content.trim() || submitting ? 0.5 : 1,
              }}
            >
              {submitting ? '등록 중...' : '문의 등록'}
            </button>
          </div>
        </section>
      )}

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            {admin ? '전체 문의' : '내 문의'}
          </h2>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{items.length}건</span>
        </div>

        {items.length === 0 ? (
          <div style={{
            padding: '42px 16px', textAlign: 'center', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--muted)', fontSize: 13,
          }}>
            등록된 문의가 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <article key={item.id} style={{
                padding: 16, borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg2)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start',
                  justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>
                        {CATEGORY_LABELS[item.category] ?? '기타'}
                      </span>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>{item.title}</h3>
                    {admin && (
                      <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 11 }}>
                        {item.userName} · {item.userEmail}
                      </div>
                    )}
                  </div>
                  <span style={{
                    flexShrink: 0, padding: '4px 7px', borderRadius: 5,
                    background: item.status === 'answered' ? 'var(--bg3)' : 'rgba(245,158,11,0.12)',
                    color: item.status === 'answered' ? 'var(--accent)' : '#d88900',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {item.status === 'answered' ? '답변 완료' : '답변 대기'}
                  </span>
                </div>

                <div style={{
                  marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
                  whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                  color: 'var(--text)', fontSize: 13, lineHeight: 1.65,
                }}>
                  {item.content}
                </div>

                {admin ? (
                  <div style={{ marginTop: 14 }}>
                    <textarea
                      value={answers[item.id] ?? ''}
                      maxLength={2000}
                      onChange={event => setAnswers(current => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="답변을 입력하세요."
                      style={{
                        width: '100%', minHeight: 90, resize: 'vertical', boxSizing: 'border-box',
                        padding: 10, borderRadius: 7, border: '1px solid var(--border)',
                        background: 'var(--bg3)', color: 'var(--text)', fontSize: 13,
                        fontFamily: 'inherit', lineHeight: 1.6, outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 7 }}>
                      <button
                        type="button"
                        onClick={() => saveAnswer(item)}
                        disabled={!answers[item.id]?.trim() || savingId === item.id}
                        style={{
                          padding: '7px 14px', border: 'none', borderRadius: 7,
                          background: 'var(--accent)', color: '#fff',
                          fontSize: 12, fontWeight: 700,
                          opacity: !answers[item.id]?.trim() || savingId === item.id ? 0.5 : 1,
                          cursor: savingId === item.id ? 'wait' : 'pointer',
                        }}
                      >
                        {savingId === item.id ? '저장 중...' : item.answer ? '답변 수정' : '답변 저장'}
                      </button>
                    </div>
                  </div>
                ) : item.answer ? (
                  <div style={{
                    marginTop: 14, padding: 12, borderRadius: 8,
                    background: 'var(--bg3)', borderLeft: '3px solid var(--accent)',
                  }}>
                    <div style={{ marginBottom: 5, color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>
                      관리자 답변
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, lineHeight: 1.65 }}>
                      {item.answer}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        @media (max-width: 640px) {
          .inquiry-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

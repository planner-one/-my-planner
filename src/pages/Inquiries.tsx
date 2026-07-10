import { useEffect, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { useAuth } from '../store/AuthContext'
import {
  answerInquiry,
  createInquiry,
  subscribeToInquiries,
  type Inquiry,
  type InquiryCategory,
} from '../services/inquiryService'
import { isAdminEmail } from '../utils/adminAccess'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'

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
    <div className="inquiry-page">
      <PageHeader
        title="문의"
        description={admin ? '등록된 문의와 답변 상태를 관리합니다.' : '사용 중 궁금한 점이나 불편한 내용을 남겨 주세요.'}
        actions={admin ? <Badge tone="accent">관리자</Badge> : undefined}
      />

      {(message || error) && (
        <div className={`inquiry-status${error ? ' error' : ''}`} role={error ? 'alert' : 'status'}>
          {error || message}
        </div>
      )}

      {!admin && (
        <Panel className="inquiry-compose" padding="lg">
          <div className="inquiry-form-grid">
            <Select value={category} onChange={event => setCategory(event.target.value as InquiryCategory)} aria-label="문의 분류">
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Input value={title} maxLength={80} onChange={event => setTitle(event.target.value)} placeholder="문의 제목" aria-label="문의 제목" />
          </div>
          <Textarea
            value={content}
            maxLength={2000}
            onChange={event => setContent(event.target.value)}
            placeholder="문의 내용을 입력해 주세요."
            aria-label="문의 내용"
          />
          <footer className="inquiry-compose-footer">
            <span>{content.length}/2000</span>
            <Button onClick={submit} loading={submitting} disabled={!title.trim() || !content.trim()}>
              문의 등록
            </Button>
          </footer>
        </Panel>
      )}

      <section className="inquiry-list-section">
        <div className="inquiry-list-heading">
          <h2>{admin ? '전체 문의' : '내 문의'}</h2>
          <span>{items.length}건</span>
        </div>

        {items.length === 0 ? (
          <Panel padding="none">
            <EmptyState title="등록된 문의가 없습니다" icon={<MessageCircleQuestion size={24} />} />
          </Panel>
        ) : (
          <div className="inquiry-list">
            {items.map(item => (
              <Panel key={item.id} className="inquiry-card" padding="lg">
                <header>
                  <div>
                    <div className="inquiry-card-meta">
                      <Badge tone="accent">{CATEGORY_LABELS[item.category] ?? '기타'}</Badge>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <h3>{item.title}</h3>
                    {admin && <small>{item.userName} · {item.userEmail}</small>}
                  </div>
                  <Badge tone={item.status === 'answered' ? 'success' : 'warning'}>
                    {item.status === 'answered' ? '답변 완료' : '답변 대기'}
                  </Badge>
                </header>

                <div className="inquiry-content">{item.content}</div>

                {admin ? (
                  <div className="inquiry-answer-editor">
                    <Textarea
                      value={answers[item.id] ?? ''}
                      maxLength={2000}
                      onChange={event => setAnswers(current => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="답변을 입력하세요."
                      aria-label={`${item.title} 답변`}
                    />
                    <Button
                      size="sm"
                      onClick={() => saveAnswer(item)}
                      loading={savingId === item.id}
                      disabled={!answers[item.id]?.trim()}
                    >
                      {item.answer ? '답변 수정' : '답변 저장'}
                    </Button>
                  </div>
                ) : item.answer ? (
                  <div className="inquiry-answer">
                    <strong>관리자 답변</strong>
                    <p>{item.answer}</p>
                  </div>
                ) : null}
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

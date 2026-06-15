import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'

export type InquiryCategory = 'usage' | 'bug' | 'suggestion' | 'other'
export type InquiryStatus = 'open' | 'answered'

export interface Inquiry {
  id: string
  userId: string
  userName: string
  userEmail: string
  category: InquiryCategory
  title: string
  content: string
  status: InquiryStatus
  answer: string
  createdAt: Timestamp | null
  answeredAt: Timestamp | null
}

interface NewInquiry {
  userId: string
  userName: string
  userEmail: string
  category: InquiryCategory
  title: string
  content: string
}

function sortByCreatedAt(items: Inquiry[]) {
  return items.sort((a, b) =>
    (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  )
}

export function subscribeToInquiries(
  userId: string,
  admin: boolean,
  onData: (items: Inquiry[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const inquiriesRef = collection(db, 'inquiries')
  const inquiriesQuery = admin
    ? query(inquiriesRef, orderBy('createdAt', 'desc'))
    : query(inquiriesRef, where('userId', '==', userId))

  return onSnapshot(
    inquiriesQuery,
    snapshot => {
      const items = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data(),
      })) as Inquiry[]
      onData(admin ? items : sortByCreatedAt(items))
    },
    () => onError('문의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
  )
}

export async function createInquiry(input: NewInquiry) {
  await addDoc(collection(db, 'inquiries'), {
    ...input,
    status: 'open',
    answer: '',
    createdAt: serverTimestamp(),
    answeredAt: null,
    updatedAt: serverTimestamp(),
  })
}

export async function answerInquiry(id: string, answer: string) {
  await updateDoc(doc(db, 'inquiries', id), {
    answer,
    status: 'answered',
    answeredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

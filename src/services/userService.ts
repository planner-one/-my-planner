import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { UserData } from '../types'

export const loadUserData = async (uid: string): Promise<UserData | null> => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserData) : null
}

export const saveUserData = (uid: string, data: UserData): Promise<void> =>
  setDoc(doc(db, 'users', uid), data, { merge: true })

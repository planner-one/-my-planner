import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { UserData } from '../types'
import { mergeUserDataForStaleSave } from '../utils/userDataMerge'

export const loadUserData = async (uid: string): Promise<UserData | null> => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserData) : null
}

export const saveUserData = async (
  uid: string,
  data: UserData,
  expectedLastSaved?: string,
): Promise<UserData> => {
  const userRef = doc(db, 'users', uid)

  if (!expectedLastSaved) {
    await setDoc(userRef, data, { merge: true })
    return data
  }

  return runTransaction(db, async transaction => {
    const snap = await transaction.get(userRef)
    const remoteData = snap.exists() ? (snap.data() as UserData) : null
    const remoteLastSaved = remoteData?._lastSaved
    const nextData = remoteLastSaved && remoteLastSaved !== expectedLastSaved
      ? mergeUserDataForStaleSave(remoteData, data)
      : data

    transaction.set(userRef, nextData, { merge: true })
    return nextData
  })
}

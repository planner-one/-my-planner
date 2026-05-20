import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

export const loadUserData = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export const saveUserData = (uid, data) =>
  setDoc(doc(db, 'users', uid), data, { merge: true })

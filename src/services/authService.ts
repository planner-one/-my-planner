import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../config/firebase'

const provider = new GoogleAuthProvider()

export const signInWithGoogle = () => signInWithPopup(auth, provider)

export const signOut = () => firebaseSignOut(auth)

export const getLocalhostAuthUrl = (href: string): string | null => {
  const url = new URL(href)
  if (url.hostname !== '127.0.0.1') return null
  url.hostname = 'localhost'
  return url.toString()
}

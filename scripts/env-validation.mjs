export const REQUIRED_FIREBASE_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export function getMissingFirebaseEnv(env) {
  return REQUIRED_FIREBASE_ENV.filter(key => !String(env[key] ?? '').trim())
}

export function assertFirebaseEnv(env) {
  const missing = getMissingFirebaseEnv(env)
  if (missing.length === 0) return
  throw new Error(`Missing required Firebase environment variables: ${missing.join(', ')}`)
}

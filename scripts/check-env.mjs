import { loadEnv } from 'vite'
import { assertFirebaseEnv } from './env-validation.mjs'

const env = loadEnv('production', process.cwd(), '')
assertFirebaseEnv(env)
console.log('Firebase environment check passed.')

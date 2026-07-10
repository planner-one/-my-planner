import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { REQUIRED_FIREBASE_ENV, assertFirebaseEnv } from './env-validation.mjs'

const env = loadEnv('production', process.cwd(), '')
assertFirebaseEnv(env)

const assetsDir = path.resolve('dist/assets')
const bundle = fs.readdirSync(assetsDir)
  .filter(file => file.endsWith('.js'))
  .map(file => fs.readFileSync(path.join(assetsDir, file), 'utf8'))
  .join('\n')

const missing = REQUIRED_FIREBASE_ENV.filter(key => !bundle.includes(String(env[key])))
if (missing.length > 0) {
  throw new Error(`Built bundle is missing Firebase configuration entries: ${missing.join(', ')}`)
}

console.log(`Built bundle contains all ${REQUIRED_FIREBASE_ENV.length} Firebase configuration entries.`)

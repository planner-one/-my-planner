import { describe, expect, it } from 'vitest'
import { assertFirebaseEnv, REQUIRED_FIREBASE_ENV } from '../scripts/env-validation.mjs'

describe('Firebase environment validation', () => {
  it('rejects a missing production configuration', () => {
    expect(() => assertFirebaseEnv({})).toThrow('Missing required Firebase environment variables')
  })

  it('accepts a complete configuration without exposing values', () => {
    const env = Object.fromEntries(REQUIRED_FIREBASE_ENV.map(key => [key, 'configured']))
    expect(() => assertFirebaseEnv(env)).not.toThrow()
  })
})

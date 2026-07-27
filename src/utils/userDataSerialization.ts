import type { UserData } from '../types'

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const omitUndefinedDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined)
      .map(omitUndefinedDeep)
  }
  if (!isPlainRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, omitUndefinedDeep(child)]),
  )
}

/**
 * Firestore는 객체 안의 `undefined` 값을 허용하지 않는다.
 * 저장 및 병합 경계에서 동일한 정규화를 사용해 선택 필드를 안전하게 생략한다.
 */
export const sanitizeUserDataForStorage = (data: UserData): UserData =>
  omitUndefinedDeep(data) as UserData

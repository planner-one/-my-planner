export const APP_VERSION = '0.3.19'
export const APP_RELEASE_DATE = '2026-07-11'
export const APP_RELEASE_NAME = 'Application Data Guard'

export const APP_RELEASE_NOTES = [
  '내 신청 저장 충돌에서 기존 personalApplications 기록이 빈 배열로 덮어써지지 않도록 보강',
  '구버전이나 비정상 유형/상태 값도 안전한 기본값으로 보정해 내 신청 카드가 표시되도록 개선',
  '내 신청 페이지에서 전체 기록 수와 현재 표시 수를 분리해 검색/필터로 숨겨진 상태를 명확히 안내',
  '구버전 문서처럼 _lastSaved가 없는 저장도 Firestore 트랜잭션 병합 경로를 사용하도록 변경',
  '내 신청 병합 회귀 체크를 추가해 원격 기록 보존과 최신 수정본 우선 규칙을 검증',
] as const

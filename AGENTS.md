# my_planner

프론트엔드 + Firebase만으로 운영되는 플래너 서비스입니다. 현재 별도 백엔드는 두지 않습니다.
추후 백엔드 서비스나 외부 API 연동 가능성을 고려해 데이터 타입, 저장 서비스, 화면 로직의 경계를 깔끔하게 유지합니다.

## CodeGraph

저장소 루트에 `.codegraph/` 디렉터리가 있으면 코드 이해나 위치 탐색 전에 CodeGraph를 먼저 사용합니다.

- MCP 도구가 있으면 `codegraph_explore`, `codegraph_node`를 우선 사용합니다.
- MCP 도구가 없으면 `codegraph explore "<질문>"`, `codegraph node <심볼-or-파일>` 명령을 사용합니다.
- `.codegraph/`가 없으면 CodeGraph를 건너뛰고 일반 탐색(`rg`, 파일 읽기 등)으로 진행합니다.

## 기술 스택

- Frontend: React 18.3 + Vite 5 + TypeScript
- Database / Auth / Hosting: Firebase
- 배포: Firebase Hosting
- GitHub Pages는 사용하지 않습니다.
- 현재 운영은 Firebase-only 기준이며, 추후 백엔드/API 연결은 별도 요구사항으로 확인 후 진행합니다.

## 문서 구조

- [NEXT_CHAT_HANDOFF.md](NEXT_CHAT_HANDOFF.md) — 다음 세션 인수인계와 현재 작업 기준점
- [REQUIREMENTS.md](REQUIREMENTS.md) — 요구사항 목록
- [SCENARIOS.md](SCENARIOS.md) — 시나리오와 구현/검토 흐름
- [PROGRESS.md](PROGRESS.md) — 작업 진행 상태와 변경 이력
- [RELEASES.md](RELEASES.md) — 버전 기준과 릴리즈 노트

## GitHub

https://github.com/planner-one/-my-planner.git

## 작업 방식

1. 새 세션 시작 시 `NEXT_CHAT_HANDOFF.md`, `REQUIREMENTS.md`, `SCENARIOS.md`, `PROGRESS.md`, `RELEASES.md`를 먼저 확인합니다.
2. 프롬프트 수신 → 요구사항 분석 → 필요 시 `REQUIREMENTS.md` 업데이트
3. 시나리오 도출/변경 → 필요 시 `SCENARIOS.md` 업데이트
4. 기능 하나 검토 → 문제 의논 → 수정 → 사용자 확인 → 커밋/푸시 순서로 진행합니다.
5. 진행 상태와 변경 이력은 `PROGRESS.md`에 남깁니다.
6. 사용자가 명시하기 전에는 여러 기능을 한꺼번에 임의 구현하지 않습니다.
7. 배포가 필요한 경우 Firebase Hosting으로 배포합니다.
8. SC-10 반응형 검토는 모바일뿐 아니라 태블릿 가로/세로 폭도 포함합니다.

## 주의 사항

- `.env`, `.claude/`, `.firebase/`, `dist/`, `node_modules/`, `.DS_Store`는 커밋하지 않습니다.
- React Grid Layout은 `1.4.4` 고정입니다. v2로 올리지 않습니다.
- 대시보드 레이아웃 저장은 `onLayoutChange`가 아니라 드래그/리사이즈 완료 시점 흐름을 유지합니다.
- 한국 날짜 계산은 UTC 밀림을 피하기 위해 `src/utils/date.ts`의 로컬 날짜 유틸을 우선 사용합니다.
- `src/widgets/JournalWidget.tsx`는 외부 피드를 보여주는 "저널 알림" 위젯이고, `src/pages/Journal.tsx`는 사용자가 작성하는 저널/일기 페이지입니다.
- Firebase 저장 흐름이나 Firestore 문서 구조 변경은 기존 사용자 데이터와 하위 호환성을 먼저 검토합니다.

# Claude Code 안내

이 저장소는 Codex와 Claude Code가 함께 사용할 수 있도록 문서 기준을 맞춥니다.

## 시작 순서

1. [AGENTS.md](AGENTS.md)를 먼저 읽고 공통 작업 방식을 따릅니다.
2. [NEXT_CHAT_HANDOFF.md](NEXT_CHAT_HANDOFF.md)를 읽어 현재 HEAD, 미완료 작업, 주의 사항을 확인합니다.
3. 필요하면 [REQUIREMENTS.md](REQUIREMENTS.md), [SCENARIOS.md](SCENARIOS.md), [PROGRESS.md](PROGRESS.md), [RELEASES.md](RELEASES.md)를 함께 대조합니다.
4. 현재 구조를 파악할 때는 [PLANNER_SYSTEM_AUDIT_2026-07-04.md](PLANNER_SYSTEM_AUDIT_2026-07-04.md)를 먼저 보고, 다음 개선 순서는 [UPDATE_SCHEDULE.md](UPDATE_SCHEDULE.md)를 기준으로 확인합니다.

## 작업 방식

- 기능 하나 검토 → 문제 의논 → 수정 → 사용자 확인 → 커밋/푸시 순서로 진행합니다.
- GitHub Pages는 사용하지 않고 Firebase Hosting을 기준으로 합니다.
- 현재 운영은 Frontend + Firebase 기준이며, 추후 백엔드/API 연동 가능성은 데이터 타입과 저장 서비스 경계를 유지하는 선에서 고려합니다.
- SC-10 반응형 검토는 모바일뿐 아니라 태블릿 가로/세로 폭도 포함합니다.
- 앱 버전 변경은 `package.json`, `src/version.ts`, `RELEASES.md`, 진행 문서를 함께 맞춥니다.
- `.env`, `.claude/`, `.firebase/`, `dist/`, `node_modules/`, `.DS_Store`는 커밋하지 않습니다.
- 문서와 코드가 다르면 실제 코드 상태를 확인한 뒤 문서를 최신화합니다.

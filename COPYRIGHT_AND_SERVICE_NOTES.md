# 저작권 / 서비스 보호 메모

_작성일: 2026-07-01_

이 문서는 플래너 서비스의 저작권, 무단 복제/재배포 방지, 약관/개인정보 고지 정리를 위한 작업 메모입니다. 법률 자문이 아니며, 실제 약관 공개나 권리 등록 전에는 전문가 검토가 필요합니다.

## 현재 상태

- 저장소는 `package.json` 기준 `private: true`입니다.
- 별도 `LICENSE.md`, `NOTICE.md`, `TERMS.md`, `PRIVACY.md` 파일은 아직 없습니다.
- 직접 의존성은 확인 기준 `MIT` 또는 `Apache-2.0` 계열입니다.
- 배포물은 프론트엔드 앱이라 브라우저에 번들 코드가 내려갑니다. 기술적으로 완전한 복제 방지는 어렵습니다.

## 기본 방향

1. 저장소는 공개 필요가 없다면 private으로 유지합니다.
2. 오픈소스로 공개할 의도가 없다면 `MIT`, `Apache-2.0` 같은 허용형 라이선스를 프로젝트 자체에 붙이지 않습니다.
3. `LICENSE.md`에는 "All rights reserved / 무단 복제, 수정, 재배포, 상업적 이용, 서비스 클론 금지" 방향의 proprietary 고지를 둡니다.
4. 앱 화면에는 `© 2026 Minsujeong. All rights reserved.` 같은 저작권 표시를 남깁니다.
5. `THIRD_PARTY_NOTICES.md`에는 React, Firebase, Chart.js 등 오픈소스 의존성 고지를 정리합니다.
6. `TERMS.md`에는 서비스 이용 조건, 무단 복제/재배포 금지, 자동화 수집/역공학 제한, 유료 기능 조건을 둡니다.
7. `PRIVACY.md`에는 Google 로그인, Firestore 저장 데이터, 문의 게시판 데이터, 향후 링크 분석 기능에서 처리할 URL/추출 정보의 이용 목적을 정리합니다.

## 보호 범위와 한계

- 저작권은 코드, UI 문구, 문서, 이미지, 구체적인 디자인 표현처럼 실제로 작성된 표현을 보호합니다.
- "플래너 앱", "일정 관리", "링크를 넣으면 자동 정리" 같은 아이디어 자체는 저작권만으로 독점하기 어렵습니다.
- 누군가 완전히 다른 코드와 디자인으로 비슷한 기능을 구현하는 것까지 막기는 어렵습니다.
- 따라서 코드 저장소 접근 제한, 명확한 라이선스 고지, 앱 내 저작권 표시, 약관/개인정보 문서, 배포/커밋 기록 보존을 함께 가져가야 합니다.

## 증거 보존

- Git 커밋 이력, 릴리즈 문서, 배포 기록, 주요 화면 스크린샷을 보존합니다.
- 기능 추가 시 `PROGRESS.md`, `RELEASES.md`, 커밋 메시지에 날짜와 범위를 남깁니다.
- 공개 서비스로 운영할 경우 주요 약관/개인정보 문서의 변경 일자도 함께 기록합니다.

## 추후 작성 후보 파일

- `LICENSE.md`: 프로젝트 자체의 proprietary 권리 고지
- `THIRD_PARTY_NOTICES.md`: 오픈소스 의존성 고지
- `TERMS.md`: 서비스 이용약관
- `PRIVACY.md`: 개인정보 처리방침 초안
- 앱 내 프로필/버전 영역: 저작권 표시

## 참고 링크

- GitHub Docs - Licensing a repository: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
- U.S. Copyright Office FAQ: https://www.copyright.gov/help/faq/faq-general.html

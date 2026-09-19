# Sprint Contract: Routing & Integration

## Objective
Establish App.tsx routing infrastructure and verify type safety, SDK isolation, and production quality.

## 만들 항목
| 파일 | 작업 |
|------|------|
| src/App.tsx | 라우트 검증: '/' (Home), '/result' (Result) 렌더, '*' → Navigate('/', replace) |
| src/lib/types.ts | 이미 완성. RouteState import만 확인 |
| src/pages/Home.tsx, Result.tsx | @ai-factory:placeholder 마커 제거 후 실제 페이지로 교체 (다음 패킷) |

## 사용 타입
- `RouteState` — navigation state shape for '/result' page
- `AppResult`, `AppInput` — RouteState의 구성 요소

## 검증 방법
1. `npx tsc --noEmit` — 타입 에러 0건
2. `npx vitest run` — 기존 테스트 통과
3. `npx vite build` — 빌드 성공, dist/ 생성
4. **금지 검사**:
   - `grep -r "http" src/` — 외부 링크 0건 (내부 navigate만)
   - `grep -r "#[0-9A-F]" src/` — HEX 색상 0건 (TDS var(--)만)
   - `grep -r "console.error" src/` — console.error 0건
   - `grep -r "Analytics\|Amplitude\|mixpanel" src/` — 외부 로깅 SDK 0건
   - `grep -r "styled-components\|tailwind" src/` — TDS 외 UI 라이브러리 0건

## 절대 금지
- **main.tsx 수정** — @AI:ANCHOR (TDSMobileAITProvider, BrowserRouter 이미 배선)
- **App.tsx 라우트 삭제** — SPEC 경로와 동기화, 추가만 가능
- **RouteState 구조 변경** — navigation 계약 유지

## 리뷰 기준
- 라우팅이 정상 작동하고 타입 일관성 있는가
- 금지 패턴 0건, TDS 의존성만 유지하는가

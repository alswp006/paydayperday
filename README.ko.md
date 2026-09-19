🇰🇷 [English](./README.md)

# PaydayPerDay — 스마트 일일 예산 계산기

급여일부터 급여일까지의 일일 지출 예산을 계산하는 토스 미니앱입니다. 급여일과 월간 예산을 한 번 설정한 후, 잔액 이월을 기반으로 자동 재계산되는 예산으로 일일 지출을 추적하면서 남은 자금이나 초과액을 남은 날짜에 재분배합니다.

급여 받은 후 과소비로 어려움을 겪는 20대~30대 한국 사용자를 위해 다음 급여일까지 현금 흐름을 관리할 수 있는 빠른 일일 지출 한도를 제공합니다.

## 주요 기능

- 📅 **예산 설정** — 급여일(1~31)과 월간 예산을 입력하면 앱이 일일 한도와 D-day 카운트다운을 자동 계산
- 💰 **빠른 지출 기록** — 오늘의 지출을 한 번 기록하면 잔액 이월을 기반으로 내일 예산 자동 재계산
- 📊 **일일 정산 리포트** — 오늘의 잔액, 내일의 예산, 주간 준수 스트릭(리워드 광고 시청 필요)을 확인
- ✓ **주간 준수 추적** — 요일별 성공/실패/없음 상태를 추적하고 지속적인 예산 준수 스트릭 카운터
- 💾 **로컬 저장** — 모든 데이터가 디바이스의 localStorage에 안전하게 저장; 백엔드 불필요

## 기술 스택

- **프론트엔드**: React 18 + Vite
- **라우터**: React Router 7
- **UI 컴포넌트**: TDS Mobile (Toss Design System)
- **네이티브 SDK**: @apps-in-toss/web-framework (햅틱 피드백, 리워드 광고, 네이티브 저장소)
- **스타일링**: Emotion (CSS-in-JS)
- **언어**: TypeScript
- **저장소**: browser localStorage
- **테스트**: Vitest + @testing-library/react + Playwright

## 시작하기

### 필수 요구사항
- Node.js 18+ (npm 또는 pnpm)

### 설치

```bash
npm install
```

### 프로덕션 빌드

```bash
npx vite build
```

최적화된 정적 번들을 `dist/`에 출력합니다.

### 토스(App-in-Toss)에 배포

```bash
npx ait build
```

그 후 [토스 개발자 콘솔](https://console.tossmini.com) 검수 절차에 따라 프로덕션에 배포합니다.

### 테스트 실행

```bash
npx vitest run           # 유닛 테스트
npm run test:visual      # 비주얼 회귀 테스트 (Playwright)
npm run typecheck        # TypeScript 확인
```

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `VITE_AIT_APP_NAME` | 토스 콘솔에 등록된 앱 이름 (`apps-in-toss.config.ts`에 설정) | 예 |

## 프로젝트 구조

```
src/
├── pages/               # 라우트 화면 (Home, Result)
├── components/          # 재사용 가능한 UI 컴포넌트 (미리 만들어진 TDS 래퍼)
├── lib/
│   ├── calculator.ts    # 일일 예산 계산 (todayBudget, 이월금)
│   ├── streak.ts        # 주간 준수 및 스트릭 계산
│   ├── budgetStore.ts   # localStorage + 할당량 처리
│   ├── date.ts          # 날짜 유틸리티 (cycleStart, cycleEnd, D-day)
│   ├── types.ts         # 공유 TypeScript 인터페이스
│   └── utils.ts         # 헬퍼 함수 (통화 포맷팅 등)
└── __tests__/           # 유닛 & 컴포넌트 테스트

.ai-factory/
├── spec.md              # 전체 제품 사양
├── apps-in-toss-essential.txt  # 검증된 SDK API 레퍼런스
└── tds-reference.txt    # TDS 컴포넌트 문서
```

## 배포

PaydayPerDay는 **토스 미니앱**(App-in-Toss)로 배포됩니다. 로컬에서 빌드한 후:

1. `npx ait build`를 실행하여 토스 호환 번들 생성
2. [토스 개발자 콘솔](https://console.tossmini.com)을 통해 번들 제출
3. 토스 검수 통과 (만 19세 이상, 외부 링크 없음, 콘솔 에러 없음, CORS 에러 없음, 다크 모드 지원)
4. 앱이 토스 CDN에서 호스팅되며 QR 코드 / 딥링크(`intoss://paydayperday`)를 통해 제공됨

참고: 로컬 개발 서버(`npm run dev`)는 문서화되지 않습니다. 검증은 `npm run test:visual`(Playwright)과 프로덕션 빌드를 통해 진행됩니다.

## 라이선스

MIT

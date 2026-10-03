🇰🇷 [English](./README.md)

# 월급계기판 — PaydayPerDay Spending Tracker for Toss

다음 급여일까지 하루에 안전하게 쓸 수 있는 금액을 자동으로 계산해주는 일일 예산 추적기입니다. 급여일과 월 예산을 한 번 설정하면, 지출을 기록하고 예산 준수 연속 기록이 늘어나는 모습을 확인하세요.

**대상 사용자**: 월급을 받는 직장인 중 다음 급여일 전에 과소비하는 것을 방지하고 싶은 사람들. **핵심 가치**: '급여일까지 11일 남음, 오늘 쓸 수 있는 금액 ₩38,000' 자동 계산 — 수동 계산 불필요.

## 기능

- 🎯 **일일 예산 자동 계산** — 남은 예산을 남은 일수로 자동 분할하며, 지출할 때마다 다시 계산
- 📝 **원클릭 지출 기록** — 빠른 단축키(+₩5K, +₩10K, +₩30K) 또는 직접 입력으로 지출 기록
- 📊 **오늘의 정산** — 오늘의 초과/절약액, 내일의 예산, 주간 준수 현황 확인(✓ 성공 / ✕ 초과 / · 기록 없음)
- 🔥 **예산 준수 연속 기록** — 일일 예산 범위 내 지출 연속일을 추적하며, 초과 시 리셋
- 💾 **로컬 저장** — 모든 데이터를 브라우저에 저장(서버 불필요, 계정 불필요)
- 🎬 **보상 광고 잠금** — 하루 한 번 광고를 보면 오늘의 정산 보고서 잠금 해제
- ↩️ **취소 & 무지출 기록** — 마지막 지출 취소 또는 무지출 일을 기록

## 기술 스택

- **Frontend**: React 18, React Router 7.5, Vite 6.3
- **UI**: Toss Design System (TDS) 모바일 컴포넌트, Emotion CSS-in-JS
- **Runtime**: Apps-in-Toss SDK (미니앱 WebView, 네이티브 햅틱 피드백, 보상 광고)
- **Storage**: 브라우저 localStorage (백엔드 없음)
- **Icons**: Lucide React

## 시작하기

### 의존성 설치
```bash
npm install
```

### 프로덕션 빌드
```bash
npx vite build
```

`dist/` 디렉토리에 정적 번들을 생성합니다. 이 앱은 클라이언트 사이드 Vite + React 빌드이며 서버 사이드 렌더링이 없습니다.

### Toss Apps-in-Toss에 배포
```bash
npx ait build      # Toss CDN용 번들링
npx ait deploy     # 프로덕션으로 배포 (API 키 필요)
```

## 환경 변수

환경변수가 필요하지 않습니다. 모든 설정(앱 이름, 브랜드 색상)은 빌드 시간에 `apps-in-toss.config.ts`에서 설정됩니다.

## 프로젝트 구조

```
src/
├── pages/              # 페이지 컴포넌트 (Home, Result)
├── components/         # UI 컴포넌트 (ScreenScaffold, SummaryHero 등)
├── lib/
│   ├── calculator.ts   # 일일 예산 & 연속 기록 로직
│   ├── budgetStore.ts  # localStorage 래퍼
│   ├── date.ts         # 날짜 유틸리티 (급여일 계산)
│   ├── streak.ts       # 연속 기록 & 주간 상태
│   └── types.ts        # 공유 TypeScript 타입
├── __tests__/          # Vitest + React Testing Library 테스트
└── App.tsx             # 라우터 & 최상위 레이아웃
```

**주요 파일**:
- `src/lib/calculator.ts` — 핵심 공식: `오늘의예산 = (전체예산 − 누적지출) / 남은일수` (100원 단위 반올림)
- `src/lib/budgetStore.ts` — 영속 상태 (설정, 일일 기록, 광고 잠금 해제 상태)
- `src/pages/Home.tsx` — 대시보드 (일일 예산, 지출 입력, 정산 버튼)
- `src/pages/Result.tsx` — 정산 보고서 (주간 그리드, 연속 기록, 내일의 예산)

## 배포

이는 공식 Toss 모바일 앱 내에서 실행되는 **Apps-in-Toss 미니앱**입니다.

1. **앱 등록** — Toss 개발자 콘솔에서 `paydayperday`로 앱 등록
2. **빌드**: `npx vite build` (또는 Toss 전용 번들의 경우 `npx ait build`)
3. **로컬 테스트**: 콘솔에서 받은 QR 코드로 Toss 샌드박스에서 번들된 앱 열기
4. **배포**: `npx ait deploy --api-key YOUR_KEY` (Toss CDN으로 배포)
5. **검수**: Toss 팀이 규정 준수 여부를 검토합니다 (외부 링크 금지, TDS UI만 사용, 콘솔 에러 0개)

성공하면 해당 앱은 공식 Toss 앱 스토어의 `intoss://paydayperday`에 나타납니다.

## 라이선스

MIT

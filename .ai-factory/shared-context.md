# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 도메인 엔티티: 예산 정보. 0003/0004/0005/0007에서 사용 (구현: 패킷 0001) */
export type Budget = { id: string; amountKrw: number; date: string; endDate: string };

/** 도메인 엔티티: 일일 지출 기록. 0002/0003/0005/0007에서 사용 (구현: 패킷 0001) */
export type Transaction = { id: string; date: string; amountKrw: number; memo?: string };

/** 도메인 엔티티: 연속 달성 기록. 0005/0006/0007에서 사용 (구현: 패킷 0001) */
export type StreakData = { currentDays: number; longestDays: number; lastCheckDate: string };

/** 포매터: 금액을 문자열로 변환 (예: ₩1,234). 0004/0005/0006/0007에서 사용 (구현: 패킷 0001) */
export type formatCurrencyFn = (amountKrw: number) => string;

/** 포매터: 날짜 문자열 변환. 0005/0006/0007에서 사용 (구현: 패킷 0001) */
export type formatDateFn = (date: string, format?: string) => string;

/** 계산: 남은 예산 및 사용률. 0005(대시보드)/0007(결과)에서 사용 (구현: 패킷 0002) */
export type calculateBudgetStatusFn = (budgetKrw: number, spentKrw: number) => { remainingKrw: number; percentUsed: number };

/** 계산: 오늘 지출 합계. 0005에서 사용 (구현: 패킷 0002) */
export type sumDailySpentFn = (transactions: Transaction[], endDate: string) => number;

/** 계산: 현재 스트릭 계산. 0005/0006/0007에서 사용 (구현: 패킷 0002) */
export type calculateCurrentStreakFn = (budget: Budget, transactions: Transaction[]) => StreakData;

/** 계산: 일일 예산 분할. 0005/0007에서 사용 (구현: 패킷 0002) */
export type calculateDailyBudgetFn = (budgetKrw: number, endDate: string) => number;

/** 스토어 훅: 데이터 영속성. 0004(SetupSheet)/0005(Dashboard)/0006(Streak)/0007(Result)에서 사용 (구현: 패킷 0003) */
export type useBudgetStoreFn = () => { saveBudget: (b: Budget) => Promise<void>; loadBudget: () => Promise<Budget | null>; addTransaction: (t: Transaction) => Promise<void>; getTransactions: (from: string, to: string) => Promise<Transaction[]>; clear: () => Promise<void> };

/** 헬퍼: 입력값 정규화 (예: '1,234' → 1234). 0004(SpendInput)에서 사용 (구현: 패킷 0003) */
export type normalizeNumberInputFn = (input: string) => number;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — add your app-specific types here
export {};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    Result.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/lib/contract.ts
export type Budget = { id: string; amountKrw: number; date: string; endDate: string };
export type Transaction = { id: string; date: string; amountKrw: number; memo?: string };
export type StreakData = { currentDays: number; longestDays: number; lastCheckDate: string };
export type formatCurrencyFn = (amountKrw: number) => string;
export type formatDateFn = (date: string, format?: string) => string;
export type calculateBudgetStatusFn = (budgetKrw: number, spentKrw: number) => { remainingKrw: number; percentUsed: number };
export type sumDailySpentFn = (transactions: Transaction[], endDate: string) => number;
export type calculateCurrentStreakFn = (budget: Budget, transactions: Transaction[]) => StreakData;
export type calculateDailyBudgetFn = (budgetKrw: number, endDate: st

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(13), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)
- [general] 외부에서 들어온 모든 값(라우터 state, 로컬 저장소, 부분 입력 폼)은 사용 직전에 배열·객체 기본값으로 정규화하고, 테이블/맵 조회 결과는 존재 확인 후에만 하위 속성이나 length에 접근하라. (60% · 타 앱 1회 — 맹신 금지)
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
// Domain types — 날짜 키는 기기 로컬 시간대 기준 'YYYY-MM-DD'
export type DateKey = string;

export interface BudgetSettings {
  /** 월급일 1~31 */
  paydayDay: number;
  /** 사이클 예산 1,000~100,000,000 */
  cycleBudget: number;
  cycleStart: DateKey;
  cycleEnd: DateKey;
}

export interface DayRecord {
  date: DateKey;
  entries: number[];
  budget: number;
}

export type RecordMap = Record<DateKey, DayRecord>;

export interface AppInput {
  settings: BudgetSettings;
  todaySpent: number;
}

export interface WeekDay {
  date: DateKey;
  status: 'success' | 'fail' | 'none' | 'future';
}

export interface AppResult {
  remainingDays: number;
  todayBudget: number;
  todaySpent: number;
  todayLeft: number;
  cycleOverspent: number;
  tomorrowBudget: number | null;
  yesterdayCarry: number | null;
  week: WeekDay[];
  streak: number;
}

export interface RouteState {
  result: AppResult;
  input: AppInput;
}

export type SaveResult = {
  ok: boolean;
  reason?: 'quota' | 'unknown';
};

export const STORAGE_KEYS = {
  settings: 'ppd:settings',
  records: 'ppd:records',
  adUnlockedDate: 'ppd:adUnlockedDate',
} as const;

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
    calculator.ts
    contract.ts
    date.test.ts
    date.ts
    storage.ts
    streak.ts
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
- calculator.ts: export function computeDaily( settings: BudgetSettings, records: RecordMap, today: DateKey, ): Omit<AppResult, 'week' | 
- contract.ts: export type Budget =; export type Transaction =; export type StreakData =; export type formatCurrencyFn = (amountKrw: number) => string; export type formatDateFn = (date: string, format?: string) => string; export type calculateBudgetStatusFn = (budgetKrw: number, spentKrw: number) =>; export type sumDailySpentFn = (transactions: Transaction[], endDate: string) => number; export type calculateCurrentStreakFn = (budget: Budget, transactions: Transaction[]) => StreakData
- date.ts: export function toDateKey(d: Date): DateKey; export function addDays(k: DateKey, n: number): DateKey; export function diffDays(a: DateKey, b: DateKey): number; export function nextPayday(today: DateKey, day: number): DateKey; export function weekKeys(today: DateKey): DateKey[]; export function formatDate(date: string, format = 'M월 D일'): string
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- streak.ts: export function weekStatus(records: RecordMap, today: DateKey): WeekDay[]; export function calcStreak(records: RecordMap, today: DateKey): number
- types.ts: export type DateKey = string; export interface BudgetSettings; export interface DayRecord; export type RecordMap = Record<DateKey, DayRecord>; export interface AppInput; export interface WeekDay; export interface AppResult; export interface RouteState
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

### Module Dependencies (import graph)
  lib/calculator.ts → imports: lib/types, lib/date
  lib/date.ts → imports: lib/types
  lib/streak.ts → imports: lib/types, lib/date
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: Types & Date Utils (files: src/lib/types.ts, src/lib/date.ts, src/lib/date.test.ts)
- 0008: Routing & Integration (files: src/App.tsx)
- 0002: Core Logic: Budget Calculator & Streak (files: src/lib/calculator.ts, src/lib/streak.ts, src/lib/logic.test.ts)
- 0003: Storage Layer & Number Input Normalizer (files: src/lib/budgetStore.ts, src/lib/numberInput.ts, src/lib/budgetStore.test.ts)
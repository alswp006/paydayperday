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

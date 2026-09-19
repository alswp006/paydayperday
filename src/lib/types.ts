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

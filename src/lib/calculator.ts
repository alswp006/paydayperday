import type { AppResult, BudgetSettings, DateKey, RecordMap } from '@/lib/types';
import type { Transaction } from '@/lib/contract';
import { addDays, diffDays, toDateKey } from '@/lib/date';

const floor100 = (n: number) => Math.floor(n / 100) * 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** 일일 예산 배분. today 이전 지출을 남은 예산에서 빼고 남은 일수로 나눈다 */
export function computeDaily(
  settings: BudgetSettings,
  records: RecordMap,
  today: DateKey,
): Omit<AppResult, 'week' | 'streak'> {
  const { cycleBudget, cycleStart, cycleEnd } = settings;
  const remainingDays = Math.max(1, diffDays(cycleEnd, today));

  let spentBefore = 0;
  for (const [date, rec] of Object.entries(records)) {
    if (date >= cycleStart && date < today) spentBefore += sum(rec?.entries ?? []);
  }
  const todaySpent = sum(records[today]?.entries ?? []);

  const todayBudget = floor100(Math.max(0, (cycleBudget - spentBefore) / remainingDays));
  const tomorrowBudget =
    remainingDays === 1
      ? null
      : floor100(Math.max(0, (cycleBudget - spentBefore - todaySpent) / (remainingDays - 1)));

  const yesterday = addDays(today, -1);
  const yRec = records[yesterday];
  const yesterdayCarry =
    yRec && yesterday >= cycleStart ? yRec.budget - sum(yRec.entries ?? []) : null;

  return {
    remainingDays,
    todayBudget,
    todaySpent,
    todayLeft: todayBudget - todaySpent,
    cycleOverspent: Math.max(0, spentBefore - cycleBudget),
    tomorrowBudget,
    yesterdayCarry,
  };
}

/** 남은 예산과 사용률(0~100 초과 가능, 소수 첫째 자리). 예산이 0 이하면 사용률 0 */
export function calculateBudgetStatus(
  budgetKrw: number,
  spentKrw: number,
): { remainingKrw: number; percentUsed: number } {
  const percentUsed = budgetKrw > 0 ? Math.round((spentKrw / budgetKrw) * 1000) / 10 : 0;
  return { remainingKrw: budgetKrw - spentKrw, percentUsed };
}

/** endDate 당일 지출 합계. 다른 날짜 기록은 제외 */
export function sumDailySpent(transactions: Transaction[], endDate: string): number {
  return sum(
    (transactions ?? []).filter((t) => t?.date === endDate).map((t) => t.amountKrw || 0),
  );
}

/** 오늘부터 endDate까지(양 끝 포함) 남은 일수로 나눈 하루 예산. 100원 단위 내림, 음수 없음 */
export function calculateDailyBudget(budgetKrw: number, endDate: string): number {
  const days = Math.max(1, diffDays(endDate, toDateKey(new Date())) + 1);
  return floor100(Math.max(0, budgetKrw) / days);
}

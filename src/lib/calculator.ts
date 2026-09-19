import type { AppResult, BudgetSettings, DateKey, RecordMap } from '@/lib/types';
import { addDays, diffDays } from '@/lib/date';

const floor100 = (n: number) => Math.floor(n / 100) * 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** 일일 예산 배분. today 이전 지출을 남은 예산에서 빼고 남은 일수로 나눈다 */
export function computeDaily(
  settings: BudgetSettings,
  records: RecordMap,
  today: DateKey,
): Omit<AppResult, 'week' | 'streak'> {
  const { cycleBudget, cycleStart, cycleEnd } = settings;
  const remainingDays = Math.max(1, diffDays(cycleEnd, today) + 1);

  let spentBefore = 0;
  for (const [date, rec] of Object.entries(records)) {
    if (date < today) spentBefore += sum(rec?.entries ?? []);
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

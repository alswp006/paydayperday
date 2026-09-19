import type { DateKey, RecordMap, WeekDay } from '@/lib/types';
import type { Budget, StreakData, Transaction } from '@/lib/contract';
import { addDays, diffDays, toDateKey, weekKeys } from '@/lib/date';

type DayStatus = 'success' | 'fail' | 'none';

function statusOf(records: RecordMap, date: DateKey): DayStatus {
  const rec = records[date];
  if (!rec) return 'none';
  const spent = (rec.entries ?? []).reduce((a, b) => a + b, 0);
  return spent <= rec.budget ? 'success' : 'fail';
}

/** 월~일 7일 상태. today 이후는 future */
export function weekStatus(records: RecordMap, today: DateKey): WeekDay[] {
  return weekKeys(today).map((date) => ({
    date,
    status: date > today ? 'future' : statusOf(records, date),
  }));
}

/** 어제(기록 있으면 오늘)부터 거슬러 연속 성공 일수 */
export function calcStreak(records: RecordMap, today: DateKey): number {
  let count = 0;
  const todayStatus = statusOf(records, today);
  if (todayStatus === 'fail') return 0;
  if (todayStatus === 'success') count = 1;

  let d = addDays(today, -1);
  for (;;) {
    const s = statusOf(records, d);
    if (s !== 'success') return s === 'fail' ? 0 : count;
    count++;
    d = addDays(d, -1);
  }
}

/**
 * 예산 기간(budget.date ~ endDate) 동안 하루 예산을 지킨 연속 일수.
 * 하루 예산 = 총액 / 전체 일수(100원 내림). 지출 없는 날도 지킨 날로 센다.
 * 오늘이 초과면 현재 스트릭 0, 기간은 오늘까지만 본다.
 */
export function calculateCurrentStreak(budget: Budget, transactions: Transaction[]): StreakData {
  const today = toDateKey(new Date());
  const last = today < budget.endDate ? today : budget.endDate;
  const totalDays = Math.max(1, diffDays(budget.endDate, budget.date) + 1);
  const limit = Math.floor(Math.max(0, budget.amountKrw) / totalDays / 100) * 100;

  const spentByDay: Record<string, number> = {};
  for (const t of transactions ?? []) {
    if (t?.date) spentByDay[t.date] = (spentByDay[t.date] ?? 0) + (t.amountKrw || 0);
  }

  let current = 0;
  let longest = 0;
  let run = 0;
  for (let d = budget.date; d <= last; d = addDays(d, 1)) {
    if ((spentByDay[d] ?? 0) <= limit) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  current = run;
  return { currentDays: current, longestDays: longest, lastCheckDate: last };
}

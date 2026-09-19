import type { DateKey, RecordMap, WeekDay } from '@/lib/types';
import { addDays, weekKeys } from '@/lib/date';

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

  // 어제 기록이 아직 없으면(오늘 첫 진입 등) 그 전날부터 센다
  let d = addDays(today, -1);
  if (count === 0 && statusOf(records, d) === 'none') d = addDays(d, -1);
  for (;;) {
    const s = statusOf(records, d);
    if (s !== 'success') return s === 'fail' ? 0 : count;
    count++;
    d = addDays(d, -1);
  }
}

import type { DateKey } from '@/lib/types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parse(k: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = k.split('-').map(Number);
  return { y, m, d };
}

/** UTC 정오 기준 일수 — DST 영향 없음 */
function toDays(k: DateKey): number {
  const { y, m, d } = parse(k);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function addDays(k: DateKey, n: number): DateKey {
  const { y, m, d } = parse(k);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function diffDays(a: DateKey, b: DateKey): number {
  return toDays(a) - toDays(b);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function paydayIn(y: number, m: number, day: number): DateKey {
  return `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

/** today 이후(당일 제외) 첫 월급일. 말일 보정 포함 */
export function nextPayday(today: DateKey, day: number): DateKey {
  const { y, m } = parse(today);
  const thisMonth = paydayIn(y, m, day);
  if (thisMonth > today) return thisMonth;
  return m === 12 ? paydayIn(y + 1, 1, day) : paydayIn(y, m + 1, day);
}

/** 월~일 7개 키. today가 속한 주 */
export function weekKeys(today: DateKey): DateKey[] {
  const { y, m, d } = parse(today);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일
  const sinceMonday = (dow + 6) % 7;
  const monday = addDays(today, -sinceMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** 'YYYY-MM-DD' → 표시 문자열. 토큰: YYYY MM DD M D. 기본 'M월 D일'. 잘못된 입력은 원문 반환 */
export function formatDate(date: string, format = 'M월 D일'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return date ?? '';
  const { y, m, d } = parse(date);
  return format.replace(/YYYY|MM|DD|M|D/g, (t) => {
    switch (t) {
      case 'YYYY': return String(y);
      case 'MM': return pad(m);
      case 'DD': return pad(d);
      case 'M': return String(m);
      default: return String(d);
    }
  });
}

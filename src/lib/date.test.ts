import { describe, it, expect } from 'vitest';
import { toDateKey, addDays, diffDays, nextPayday, weekKeys, formatDate } from '@/lib/date';

describe('date utils', () => {
  it('nextPayday F1-AC-4 cases', () => {
    expect(nextPayday('2026-09-20', 25)).toBe('2026-09-25');
    expect(nextPayday('2026-09-20', 10)).toBe('2026-10-10');
    expect(nextPayday('2026-09-25', 25)).toBe('2026-10-25');
    expect(nextPayday('2026-09-20', 31)).toBe('2026-09-30');
  });
  it('nextPayday leap year and year rollover', () => {
    expect(nextPayday('2028-02-10', 31)).toBe('2028-02-29');
    expect(nextPayday('2026-12-25', 25)).toBe('2027-01-25');
  });
  it('diffDays / addDays', () => {
    expect(diffDays('2026-10-25', '2026-09-25')).toBe(30);
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });
  it('toDateKey uses local time', () => {
    expect(toDateKey(new Date(2026, 8, 5))).toBe('2026-09-05');
  });
  it('weekKeys Mon–Sun ending on today (Sunday)', () => {
    const w = weekKeys('2026-09-20');
    expect(w).toHaveLength(7);
    expect(w[0]).toBe('2026-09-14');
    expect(w[6]).toBe('2026-09-20');
  });
  it('formatDate default and custom formats', () => {
    expect(formatDate('2026-09-05')).toBe('9월 5일');
    expect(formatDate('2026-09-05', 'YYYY.MM.DD')).toBe('2026.09.05');
    expect(formatDate('bad')).toBe('bad');
  });
});

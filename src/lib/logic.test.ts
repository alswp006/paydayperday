import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BudgetSettings, RecordMap } from '@/lib/types';
import { computeDaily, calculateBudgetStatus, sumDailySpent, calculateDailyBudget } from '@/lib/calculator';
import { weekStatus, calcStreak, calculateCurrentStreak } from '@/lib/streak';

const settings = (cycleBudget: number, cycleStart: string, cycleEnd: string): BudgetSettings => ({
  paydayDay: 25,
  cycleBudget,
  cycleStart,
  cycleEnd,
});
const rec = (date: string, entries: number[], budget: number) => ({ date, entries, budget });

describe('computeDaily', () => {
  const s = settings(500000, '2026-09-20', '2026-09-25');
  const today = '2026-09-20';

  it('이전 지출 0원이면 todayBudget은 100,000', () => {
    const r = computeDaily(s, {}, today);
    expect(r.remainingDays).toBe(5);
    expect(r.todayBudget).toBe(100000);
  });

  it('120,000원 사용 시 todayLeft -20,000, tomorrowBudget 95,000', () => {
    const r = computeDaily(s, { [today]: rec(today, [120000], 100000) }, today);
    expect(r.todayLeft).toBe(-20000);
    expect(r.tomorrowBudget).toBe(95000);
  });

  it('55,000원 사용 시 tomorrowBudget 111,200', () => {
    const r = computeDaily(s, { [today]: rec(today, [55000], 100000) }, today);
    expect(r.tomorrowBudget).toBe(111200);
  });

  it('이전 지출이 총액을 넘으면 todayBudget 0, cycleOverspent > 0', () => {
    const records: RecordMap = { '2026-09-19': rec('2026-09-19', [600000], 100000) };
    const r = computeDaily({ ...s, cycleStart: '2026-09-19' }, records, today);
    expect(r.todayBudget).toBe(0);
    expect(r.cycleOverspent).toBeGreaterThan(0);
    expect(r.tomorrowBudget).toBe(0);
  });

  it('마지막 날이면 tomorrowBudget은 null', () => {
    expect(computeDaily(s, {}, '2026-09-24').tomorrowBudget).toBeNull();
  });

  it('어제가 cycleStart 이전이면 yesterdayCarry는 null', () => {
    const records: RecordMap = { '2026-09-19': rec('2026-09-19', [1000], 5000) };
    expect(computeDaily(s, records, today).yesterdayCarry).toBeNull();
  });

  it('어제 기록이 있으면 yesterdayCarry는 budget - 지출', () => {
    const records: RecordMap = { '2026-09-20': rec('2026-09-20', [30000], 100000) };
    expect(computeDaily(s, records, '2026-09-21').yesterdayCarry).toBe(70000);
  });
});

describe('calcStreak', () => {
  const today = '2026-09-20';
  const ok = (d: string) => rec(d, [1000], 5000);

  it('오늘 기록 없음 + 어제까지 3일 success면 3', () => {
    const records: RecordMap = {
      '2026-09-19': ok('2026-09-19'),
      '2026-09-18': ok('2026-09-18'),
      '2026-09-17': ok('2026-09-17'),
    };
    expect(calcStreak(records, today)).toBe(3);
  });

  it('오늘 fail이면 0', () => {
    expect(calcStreak({ [today]: rec(today, [9000], 5000) }, today)).toBe(0);
  });

  it('none을 만나면 멈춘다', () => {
    const records: RecordMap = { '2026-09-19': ok('2026-09-19'), '2026-09-17': ok('2026-09-17') };
    expect(calcStreak(records, today)).toBe(1);
  });

  it('entries가 []인 날은 success', () => {
    const records: RecordMap = { '2026-09-19': rec('2026-09-19', [], 5000) };
    expect(calcStreak(records, today)).toBe(1);
  });
});

describe('weekStatus', () => {
  it('일요일이면 week[6]이 오늘이고 앞 6칸은 future가 아니다', () => {
    const week = weekStatus({}, '2026-09-20');
    expect(week).toHaveLength(7);
    expect(week[6].date).toBe('2026-09-20');
    week.slice(0, 6).forEach((w) => expect(w.status).not.toBe('future'));
  });

  it('오늘 이후 날짜는 future', () => {
    const week = weekStatus({}, '2026-09-17');
    expect(week[3].date).toBe('2026-09-17');
    expect(week.slice(4).every((w) => w.status === 'future')).toBe(true);
  });
});

describe('contract 함수', () => {
  afterEach(() => vi.useRealTimers());

  it('calculateBudgetStatus: 남은 금액과 사용률', () => {
    expect(calculateBudgetStatus(200000, 50000)).toEqual({ remainingKrw: 150000, percentUsed: 25 });
    expect(calculateBudgetStatus(0, 1000)).toEqual({ remainingKrw: -1000, percentUsed: 0 });
  });

  it('sumDailySpent: 해당 날짜 지출만 합산', () => {
    const tx = [
      { id: 'a', date: '2026-09-20', amountKrw: 3000 },
      { id: 'b', date: '2026-09-20', amountKrw: 2000 },
      { id: 'c', date: '2026-09-19', amountKrw: 9000 },
    ];
    expect(sumDailySpent(tx, '2026-09-20')).toBe(5000);
    expect(sumDailySpent([], '2026-09-20')).toBe(0);
  });

  it('calculateDailyBudget: 남은 일수로 나눠 100원 내림', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 12));
    expect(calculateDailyBudget(500000, '2026-09-24')).toBe(100000);
    expect(calculateDailyBudget(-1, '2026-09-24')).toBe(0);
  });

  it('calculateCurrentStreak: 초과일에서 끊기고 최장 기록 유지', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 12));
    const budget = { id: 'b', amountKrw: 1000000, date: '2026-09-16', endDate: '2026-09-25' };
    const tx = [{ id: 't', date: '2026-09-18', amountKrw: 500000 }];
    const r = calculateCurrentStreak(budget, tx);
    expect(r).toEqual({ currentDays: 2, longestDays: 2, lastCheckDate: '2026-09-20' });
  });
});

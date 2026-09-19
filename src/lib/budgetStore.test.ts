import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBudgetStore, load, saveSettings, addSpend, markNoSpend, undoLastSpend, resetAll } from '@/lib/budgetStore';
import { normalizeDigits, toIntOrNull, normalizeNumberInput } from '@/lib/numberInput';

describe('numberInput', () => {
  it.each([
    ['$5,000', 5000],
    ['-25', 25],
    ['50000.99', 5000099],
    ['abc', null],
    ['0', null],
  ])('%s → %s', (raw, n) => expect(toIntOrNull(raw)).toBe(n));
  it('maxDigits', () => expect(normalizeDigits('25.5', 2)).toBe('25'));
});

describe('budgetStore', () => {
  it('깨진 JSON이면 {ok:false}', () => {
    localStorage.setItem('ppd:settings', '{oops');
    expect(load()).toEqual({ ok: false });
  });

  it('설정 저장 후 오늘 budget 스냅샷과 cycleStart 유지', () => {
    expect(saveSettings(25, 300000, { newCycle: true }).ok).toBe(true);
    const first = load();
    expect(first.ok && first.settings?.cycleStart).toBeTruthy();
    saveSettings(25, 600000, { newCycle: false });
    const second = load();
    if (first.ok && second.ok) {
      expect(second.settings?.cycleStart).toBe(first.settings?.cycleStart);
      expect(Object.values(second.records)[0].budget).toBeGreaterThan(0);
    }
  });

  it('지출 추가·취소·무지출', () => {
    saveSettings(25, 300000, { newCycle: true });
    addSpend(5000);
    addSpend(3000);
    undoLastSpend();
    let r = load();
    expect(r.ok && Object.values(r.records)[0].entries).toEqual([5000]);
    markNoSpend();
    r = load();
    expect(r.ok && Object.values(r.records)[0].entries).toEqual([5000]);
  });

  it('쓰기 실패 시 기존 값 유지', () => {
    saveSettings(25, 300000, { newCycle: true });
    const before = localStorage.getItem('ppd:records');
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('x');
    };
    const res = addSpend(1000);
    Storage.prototype.setItem = orig;
    expect(res).toEqual({ ok: false, reason: 'unknown' });
    expect(localStorage.getItem('ppd:records')).toBe(before);
  });

  it('resetAll은 ppd: 키를 지운다', () => {
    saveSettings(25, 300000, { newCycle: true });
    resetAll();
    expect(localStorage.getItem('ppd:settings')).toBeNull();
  });
});

describe('useBudgetStore / normalizeNumberInput', () => {
  it('normalizeNumberInput', () => {
    expect(normalizeNumberInput('1,234')).toBe(1234);
    expect(normalizeNumberInput('abc')).toBe(0);
  });

  it('예산·지출 저장/조회/초기화', async () => {
    const { result } = renderHook(() => useBudgetStore());
    const s = result.current;
    expect(await s.loadBudget()).toBeNull();
    const b = { id: 'b1', amountKrw: 300000, date: '2026-09-01', endDate: '2026-09-25' };
    await s.saveBudget(b);
    expect(await s.loadBudget()).toEqual(b);
    await s.addTransaction({ id: 't1', date: '2026-09-02', amountKrw: 5000 });
    await s.addTransaction({ id: 't2', date: '2026-09-10', amountKrw: 3000 });
    expect((await s.getTransactions('2026-09-01', '2026-09-05')).map((t) => t.id)).toEqual(['t1']);
    await s.clear();
    expect(await s.loadBudget()).toBeNull();
    expect(await s.getTransactions('2026-01-01', '2026-12-31')).toEqual([]);
  });
});

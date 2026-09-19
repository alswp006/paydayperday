import { useMemo } from 'react';
import type { Budget, Transaction } from '@/lib/contract';
import type { BudgetSettings, DayRecord, RecordMap, SaveResult } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/types';
import * as storage from '@/lib/storage';
import { addDays, nextPayday, toDateKey } from '@/lib/date';
import { computeDaily } from '@/lib/calculator';

export { normalizeDigits, toIntOrNull } from '@/lib/numberInput';

export type LoadResult =
  | { ok: true; settings: BudgetSettings | null; records: RecordMap }
  | { ok: false };

const RETENTION_DAYS = 60;
const QUOTA_RETENTION_DAYS = 30;

type Read = { broken: boolean; value: unknown };

/** 저장소 값을 읽는다. 문자열이면 JSON으로 파싱하고, 파싱 실패(또는 helper가 삼킨 깨진 값)는 broken */
function read(key: string): Read {
  let v: unknown;
  try {
    v = storage.getItem<unknown>(key);
  } catch {
    return { broken: true, value: null };
  }
  if (typeof v === 'string') {
    try {
      return { broken: false, value: JSON.parse(v) };
    } catch {
      return { broken: true, value: null };
    }
  }
  if (v == null) {
    // storage.getItem은 깨진 JSON을 null로 삼키므로 원문이 남아 있는지 확인
    try {
      if (localStorage.getItem(key)) return { broken: true, value: null };
    } catch {
      /* 접근 불가 — 없는 것으로 취급 */
    }
  }
  return { broken: false, value: v ?? null };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function asSettings(v: unknown): BudgetSettings | null {
  if (!isObj(v)) return null;
  const { paydayDay, cycleBudget, cycleStart, cycleEnd } = v;
  if (
    typeof paydayDay !== 'number' ||
    typeof cycleBudget !== 'number' ||
    typeof cycleStart !== 'string' ||
    typeof cycleEnd !== 'string'
  ) {
    return null;
  }
  return { paydayDay, cycleBudget, cycleStart, cycleEnd };
}

function asRecords(v: unknown): RecordMap {
  const out: RecordMap = {};
  if (!isObj(v)) return out;
  for (const [date, rec] of Object.entries(v)) {
    if (!isObj(rec)) continue;
    const entries = Array.isArray(rec.entries)
      ? rec.entries.filter((n): n is number => typeof n === 'number')
      : [];
    out[date] = { date, entries, budget: typeof rec.budget === 'number' ? rec.budget : 0 };
  }
  return out;
}

function prune(records: RecordMap, today: string, days: number): RecordMap {
  const limit = addDays(today, -days);
  const out: RecordMap = {};
  for (const [date, rec] of Object.entries(records)) {
    if (date >= limit) out[date] = rec;
  }
  return out;
}

export function load(): LoadResult {
  const s = read(STORAGE_KEYS.settings);
  const r = read(STORAGE_KEYS.records);
  if (s.broken || r.broken) return { ok: false };
  const today = toDateKey(new Date());
  return {
    ok: true,
    settings: asSettings(s.value),
    records: prune(asRecords(r.value), today, RETENTION_DAYS),
  };
}

const isQuota = (e: unknown) =>
  e instanceof Error &&
  (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(e.message));

interface Snapshot {
  settings: BudgetSettings | null;
  records: RecordMap;
}

/** 쓸 데이터를 모두 만든 뒤 한 번에 setItem. 도중 실패하면 이미 쓴 키를 되돌린다 */
function commit(next: Snapshot, today: string): SaveResult {
  const attempt = (records: RecordMap): SaveResult => {
    const writes: [string, string][] = [[STORAGE_KEYS.records, JSON.stringify(records)]];
    if (next.settings) writes.push([STORAGE_KEYS.settings, JSON.stringify(next.settings)]);
    const done: string[] = [];
    const prev = new Map<string, string | null>();
    try {
      for (const [k] of writes) prev.set(k, localStorage.getItem(k));
    } catch {
      /* 이전 값을 못 읽으면 롤백 생략 */
    }
    try {
      for (const [k, v] of writes) {
        storage.setItem(k, v);
        done.push(k);
      }
      return { ok: true };
    } catch (e) {
      for (const k of done) {
        try {
          const old = prev.get(k);
          if (old == null) storage.removeItem(k);
          else localStorage.setItem(k, old);
        } catch {
          /* 롤백 실패는 무시 */
        }
      }
      return { ok: false, reason: isQuota(e) ? 'quota' : 'unknown' };
    }
  };

  const base = prune(next.records, today, RETENTION_DAYS);
  const first = attempt(base);
  if (first.ok || first.reason !== 'quota') return first;
  return attempt(prune(base, today, QUOTA_RETENTION_DAYS));
}

/** 현재 저장 상태(없거나 깨졌으면 빈 상태) */
function snapshot(): Snapshot {
  const s = read(STORAGE_KEYS.settings);
  const r = read(STORAGE_KEYS.records);
  return { settings: asSettings(s.value), records: asRecords(r.value) };
}

function withToday(snap: Snapshot, today: string, entries: number[]): Snapshot {
  const budget = snap.settings ? computeDaily(snap.settings, snap.records, today).todayBudget : 0;
  const rec: DayRecord = { date: today, entries, budget };
  return { settings: snap.settings, records: { ...snap.records, [today]: rec } };
}

export function saveSettings(
  paydayDay: number,
  cycleBudget: number,
  opts: { newCycle: boolean },
): SaveResult {
  const today = toDateKey(new Date());
  const snap = snapshot();
  const cycleStart = opts.newCycle || !snap.settings ? today : snap.settings.cycleStart;
  const settings: BudgetSettings = {
    paydayDay,
    cycleBudget,
    cycleStart,
    cycleEnd: nextPayday(today, paydayDay),
  };
  const existing = snap.records[today];
  if (!existing) return commit({ settings, records: snap.records }, today);
  return commit(withToday({ settings, records: snap.records }, today, existing.entries), today);
}

export function addSpend(amount: number): SaveResult {
  const today = toDateKey(new Date());
  const snap = snapshot();
  const entries = [...(snap.records[today]?.entries ?? []), amount];
  return commit(withToday(snap, today, entries), today);
}

export function markNoSpend(): SaveResult {
  const today = toDateKey(new Date());
  const snap = snapshot();
  if ((snap.records[today]?.entries.length ?? 0) > 0) return { ok: true };
  return commit(withToday(snap, today, []), today);
}

export function undoLastSpend(): SaveResult {
  const today = toDateKey(new Date());
  const snap = snapshot();
  const entries = snap.records[today]?.entries ?? [];
  if (entries.length === 0) return { ok: true };
  return commit(withToday(snap, today, entries.slice(0, -1)), today);
}

export function isAdUnlockedToday(): boolean {
  try {
    return storage.getItem<string>(STORAGE_KEYS.adUnlockedDate) === toDateKey(new Date());
  } catch {
    return false;
  }
}

export function markAdUnlocked(): SaveResult {
  try {
    storage.setItem(STORAGE_KEYS.adUnlockedDate, toDateKey(new Date()));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: isQuota(e) ? 'quota' : 'unknown' };
  }
}

export function resetAll(): void {
  for (const k of Object.values(STORAGE_KEYS)) {
    try {
      storage.removeItem(k);
    } catch {
      /* 무시 */
    }
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('ppd:')) localStorage.removeItem(k);
    }
  } catch {
    /* 무시 */
  }
}

const BUDGET_KEY = 'ppd:budget';
const TRANSACTIONS_KEY = 'ppd:transactions';

function readTransactions(): Transaction[] {
  const v = storage.getItem<unknown>(TRANSACTIONS_KEY);
  if (!Array.isArray(v)) return [];
  return v.filter(
    (t): t is Transaction =>
      isObj(t) && typeof t.id === 'string' && typeof t.date === 'string' && typeof t.amountKrw === 'number',
  );
}

function asBudget(v: unknown): Budget | null {
  if (!isObj(v)) return null;
  const { id, amountKrw, date, endDate } = v;
  if (
    typeof id !== 'string' ||
    typeof amountKrw !== 'number' ||
    typeof date !== 'string' ||
    typeof endDate !== 'string'
  ) {
    return null;
  }
  return { id, amountKrw, date, endDate };
}

/** 예산·지출 영속성 훅. 모든 메서드는 localStorage 기반이며 참조가 안정적이다 */
export function useBudgetStore(): {
  saveBudget: (b: Budget) => Promise<void>;
  loadBudget: () => Promise<Budget | null>;
  addTransaction: (t: Transaction) => Promise<void>;
  getTransactions: (from: string, to: string) => Promise<Transaction[]>;
  clear: () => Promise<void>;
} {
  return useMemo(
    () => ({
      saveBudget: async (b: Budget) => {
        storage.setItem(BUDGET_KEY, b);
      },
      loadBudget: async () => asBudget(storage.getItem<unknown>(BUDGET_KEY)),
      addTransaction: async (t: Transaction) => {
        storage.setItem(TRANSACTIONS_KEY, [...readTransactions(), t]);
      },
      getTransactions: async (from: string, to: string) =>
        readTransactions().filter((t) => t.date >= from && t.date <= to),
      clear: async () => {
        storage.removeItem(BUDGET_KEY);
        storage.removeItem(TRANSACTIONS_KEY);
      },
    }),
    [],
  );
}

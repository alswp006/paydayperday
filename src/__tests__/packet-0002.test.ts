import { describe, it, expect } from "vitest";
import type {
  BudgetSettings,
  RecordMap,
  DayRecord,
  DateKey,
} from "@/lib/types";
import { addDays } from "@/lib/date";
import { computeDaily } from "@/lib/calculator";
import { weekStatus, calcStreak } from "@/lib/streak";

/**
 * Packet 0002: Core Logic — Budget Calculator & Streak
 *
 * Tests for pure functions:
 * - computeDaily(settings, records, today): daily budget allocation + remaining budget
 * - weekStatus(records, today): 7-day week status (success/fail/none/future)
 * - calcStreak(records, today): consecutive successful days
 */

// Test helpers — simulate DayRecord creation
function makeRecord(
  date: DateKey,
  entries: number[],
  budget: number,
): DayRecord {
  return { date, entries, budget };
}

// Helper to create settings with specific cycle
function makeSettings(
  cycleBudget: number,
  cycleStart: DateKey,
  cycleEnd: DateKey,
  paydayDay: number = 25,
): BudgetSettings {
  return { paydayDay, cycleBudget, cycleStart, cycleEnd };
}

describe("AC-1: Daily budget calculation with carryover", () => {
  it("should calculate todayBudget = floor100(cycleBudget / remainingDays) when no prior spending", () => {
    // Setup: 500,000원 budget, 5 days remaining (2026-09-20 to 2026-09-24)
    const settings = makeSettings(
      500000, // cycleBudget
      "2026-09-20", // cycleStart (today)
      "2026-09-24", // cycleEnd (4 days later, so 5 days total)
      25,
    );
    const records: RecordMap = {}; // No prior spending
    const today = "2026-09-20";

    // Expected: remainingDays = 5, todayBudget = floor(500000/5) = 100000
    const result = computeDaily(settings, records, today);

    expect(result.remainingDays).toBe(5);
    expect(result.todayBudget).toBe(100000);
    expect(result.todaySpent).toBe(0);
    expect(result.todayLeft).toBe(100000);
  });

  it("should calculate tomorrowBudget = floor100((cycleBudget - spentToday) / (remainingDays - 1))", () => {
    // AC-1 case 1: spend 55,000 today → tomorrowBudget = floor((500000-55000)/4) = floor(111250) = 111200
    const settings = makeSettings(500000, "2026-09-20", "2026-09-24", 25);
    const records: RecordMap = {};
    const today = "2026-09-20";

    const result = computeDaily(settings, records, today);
    result.todaySpent = 55000; // Simulate spending 55,000 today

    // Recalculate for tomorrow perspective
    const resultAfterSpend = computeDaily(
      settings,
      { [today]: makeRecord(today, [55000], 100000) }, // Record today's spending
      addDays(today, 1), // Tomorrow's perspective
    );

    // Tomorrow: spentBefore = 55000, remainingDays = 4
    // tomorrowBudget = floor((500000-55000)/4) = floor(111250) = 111200
    expect(resultAfterSpend.todayBudget).toBe(111200);
  });

  it("should calculate negative todayLeft when spending exceeds todayBudget", () => {
    // AC-1 case 2: todayBudget 100000, spend 120000 → todayLeft = -20000
    const settings = makeSettings(500000, "2026-09-20", "2026-09-24", 25);
    const today = "2026-09-20";

    const result = computeDaily(settings, {}, today);
    expect(result.todayBudget).toBe(100000);

    // Simulate spending 120000
    const resultWithSpend = computeDaily(
      settings,
      { [today]: makeRecord(today, [120000], 100000) },
      today,
    );
    expect(resultWithSpend.todaySpent).toBe(120000);
    expect(resultWithSpend.todayLeft).toBe(-20000);

    // tomorrowBudget = floor((500000-120000)/4) = floor(95000) = 95000
    const resultTomorrow = computeDaily(
      settings,
      { [today]: makeRecord(today, [120000], 100000) },
      addDays(today, 1),
    );
    expect(resultTomorrow.todayBudget).toBe(95000);
  });
});

describe("AC-2: Budget bounds and edge cases", () => {
  it("should set todayBudget = 0 and cycleOverspent > 0 when prior spending exceeds cycleBudget", () => {
    // Setup: 100,000원 budget, already spent 150,000 before today
    const settings = makeSettings(100000, "2026-09-20", "2026-09-24", 25);
    const yesterday = "2026-09-19";
    const today = "2026-09-20";

    const records: RecordMap = {
      [yesterday]: makeRecord(yesterday, [150000], 100000),
    };

    const result = computeDaily(settings, records, today);

    expect(result.todayBudget).toBe(0);
    expect(result.cycleOverspent).toBeGreaterThan(0);
    expect(result.cycleOverspent).toBe(150000 - 100000); // 50,000 overspent
  });

  it("should set tomorrowBudget = null when remainingDays = 1 (last day of cycle)", () => {
    const settings = makeSettings(100000, "2026-09-24", "2026-09-24", 25); // cycleEnd = today
    const today = "2026-09-24";

    const result = computeDaily(settings, {}, today);

    expect(result.remainingDays).toBe(1);
    expect(result.tomorrowBudget).toBeNull();
  });

  it("should set yesterdayCarry = null when yesterday is before cycleStart", () => {
    // Setup: cycle starts today, so yesterday is outside cycle
    const settings = makeSettings(100000, "2026-09-20", "2026-09-24", 25);
    const today = "2026-09-20"; // cycleStart = today

    const result = computeDaily(settings, {}, today);

    // No yesterday record within cycle
    expect(result.yesterdayCarry).toBeNull();
  });

  it("should calculate yesterdayCarry = yesterdayBudget - yesterdaySpent when yesterday exists in cycle", () => {
    // Setup: cycle includes yesterday
    const settings = makeSettings(500000, "2026-09-18", "2026-09-24", 25);
    const yesterday = "2026-09-19";
    const today = "2026-09-20";

    // Yesterday had budget 100000, spent 60000
    const records: RecordMap = {
      [yesterday]: makeRecord(yesterday, [60000], 100000),
    };

    const result = computeDaily(settings, records, today);

    // yesterdayCarry = 100000 - 60000 = 40000
    expect(result.yesterdayCarry).toBe(40000);
  });
});

describe("AC-3: Streak calculation", () => {
  it("should return 3 when last 3 days are success and today has no record", () => {
    // Setup: 3 consecutive success days, today no record yet
    const today = "2026-09-20";
    const day1 = "2026-09-17"; // success
    const day2 = "2026-09-18"; // success
    const day3 = "2026-09-19"; // success

    const records: RecordMap = {
      [day1]: makeRecord(day1, [50000], 100000), // spent < budget
      [day2]: makeRecord(day2, [70000], 100000), // spent < budget
      [day3]: makeRecord(day3, [80000], 100000), // spent < budget
    };

    const streak = calcStreak(records, today);

    expect(streak).toBe(3);
  });

  it("should return 0 when today has a fail record", () => {
    const today = "2026-09-20";
    const yesterday = "2026-09-19";

    const records: RecordMap = {
      [yesterday]: makeRecord(yesterday, [80000], 100000), // success
      [today]: makeRecord(today, [150000], 100000), // fail (overspent)
    };

    const streak = calcStreak(records, today);

    expect(streak).toBe(0);
  });

  it("should stop counting when encountering a 'none' status", () => {
    // Setup: success → success → none (no record) → success → success
    // Streak should stop at 'none', not continue to future successes
    const today = "2026-09-20";
    const d1 = "2026-09-17"; // success
    const d2 = "2026-09-18"; // success
    // d3 = "2026-09-19"; // none (no record)
    // d4 = "2026-09-20"; // future/none

    const records: RecordMap = {
      [d1]: makeRecord(d1, [50000], 100000),
      [d2]: makeRecord(d2, [70000], 100000),
      // No record for d3, d4
    };

    const streak = calcStreak(records, today);

    // Only d1 and d2 before gap
    expect(streak).toBe(2);
  });

  it("should treat empty entries as success (entries: [] = within budget)", () => {
    const today = "2026-09-20";
    const day1 = "2026-09-19"; // entries = [], budget = 100000 → success
    const day2 = "2026-09-18"; // entries = [50000], budget = 100000 → success

    const records: RecordMap = {
      [day1]: makeRecord(day1, [], 100000), // No spending → success
      [day2]: makeRecord(day2, [50000], 100000),
    };

    const streak = calcStreak(records, today);

    expect(streak).toBe(2);
  });

  it("should return 0 when first record from today backward is fail", () => {
    const today = "2026-09-20";

    const records: RecordMap = {
      [today]: makeRecord(today, [150000], 100000), // Overspent today
    };

    const streak = calcStreak(records, today);

    expect(streak).toBe(0);
  });
});

describe("AC-4: Week status calculation", () => {
  it("should return 7 WeekDay entries with correct date order (Mon-Sun)", () => {
    // 2026-09-20 is Sunday
    // Week should be: Mon 2026-09-14 ... Sun 2026-09-20
    const today = "2026-09-20";
    const records: RecordMap = {};

    const weekDays = weekStatus(records, today);

    expect(weekDays).toHaveLength(7);
    expect(weekDays[0].date).toBe("2026-09-14"); // Monday
    expect(weekDays[6].date).toBe("2026-09-20"); // Sunday (today)
  });

  it("should mark today as today's week position (week[6] when today is Sunday)", () => {
    const today = "2026-09-20"; // Sunday
    const records: RecordMap = {
      [today]: makeRecord(today, [50000], 100000),
    };

    const weekDays = weekStatus(records, today);

    expect(weekDays[6].date).toBe(today);
    expect(weekDays[6].status).not.toBe("future");
  });

  it("should mark dates after today as 'future'", () => {
    const today = "2026-09-19"; // Friday
    // Week is Mon-Sun: 2026-09-14 to 2026-09-20
    // Sat 2026-09-20 and Sun should be "future"
    const records: RecordMap = {};

    const weekDays = weekStatus(records, today);

    const futureDays = weekDays.filter((d) => d.status === "future");
    expect(futureDays.length).toBeGreaterThan(0);
    expect(futureDays.every((d) => d.date > today)).toBe(true);
  });

  it("should mark historical days as 'success' or 'fail' based on spending", () => {
    const today = "2026-09-20";
    const day1 = "2026-09-14"; // success: 50000 < 100000
    const day2 = "2026-09-15"; // fail: 150000 > 100000

    const records: RecordMap = {
      [day1]: makeRecord(day1, [50000], 100000),
      [day2]: makeRecord(day2, [150000], 100000),
    };

    const weekDays = weekStatus(records, today);

    const week14 = weekDays.find((d) => d.date === day1);
    const week15 = weekDays.find((d) => d.date === day2);

    expect(week14?.status).toBe("success");
    expect(week15?.status).toBe("fail");
  });

  it("should mark days with no record as 'none' (within cycle dates)", () => {
    const today = "2026-09-20";
    const day1 = "2026-09-16"; // no record

    const records: RecordMap = {
      // day1 not in records
    };

    const weekDays = weekStatus(records, today);

    const week16 = weekDays.find((d) => d.date === day1);
    expect(week16?.status).toBe("none");
  });

  it("should not mark any past days as 'future'", () => {
    const today = "2026-09-20";
    const records: RecordMap = {};

    const weekDays = weekStatus(records, today);

    const pastDays = weekDays.filter((d) => d.date < today);
    expect(pastDays.every((d) => d.status !== "future")).toBe(true);
  });
});

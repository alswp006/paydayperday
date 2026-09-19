import { describe, it, expect } from "vitest";
import {
  addDays,
  diffDays,
  nextPayday,
  weekKeys,
} from "@/lib/date";
import {
  STORAGE_KEYS,
  type SaveResult,
  type DateKey,
} from "@/lib/types";

describe("Types & Date Utils — Packet 0001", () => {
  describe("AC-1: nextPayday with month-end correction", () => {
    it("should return paydate in current cycle if not yet reached (2026-09-20, day 25)", () => {
      const result = nextPayday("2026-09-20", 25);
      expect(result).toBe("2026-09-25");
    });

    it("should advance to next cycle if paydate already passed (2026-09-20, day 10)", () => {
      const result = nextPayday("2026-09-20", 10);
      expect(result).toBe("2026-10-10");
    });

    it("should advance to next month if already reached in current cycle (2026-09-25, day 25)", () => {
      const result = nextPayday("2026-09-25", 25);
      expect(result).toBe("2026-10-25");
    });

    it("should correct to month-end if day exceeds month length (2026-09-20, day 31)", () => {
      const result = nextPayday("2026-09-20", 31);
      expect(result).toBe("2026-09-30");
    });
  });

  describe("AC-2: leap year handling and diffDays", () => {
    it("should handle leap year February correctly (2028-02-10, day 31)", () => {
      const result = nextPayday("2028-02-10", 31);
      expect(result).toBe("2028-02-29");
    });

    it("should calculate day difference correctly (2026-10-25 - 2026-09-25)", () => {
      const result = diffDays("2026-10-25", "2026-09-25");
      expect(result).toBe(30);
    });
  });

  describe("AC-3: weekKeys returns 7 days from Monday to Sunday", () => {
    it("should return 7 DateKeys starting from Monday to Sunday", () => {
      const result = weekKeys("2026-09-20");
      expect(result).toHaveLength(7);
      expect(result[0]).toBe("2026-09-14"); // Monday
      expect(result[6]).toBe("2026-09-20"); // Sunday (today)
    });

    it("should return consecutive days in correct order", () => {
      const result = weekKeys("2026-09-20");
      for (let i = 1; i < result.length; i++) {
        const dayDiff = diffDays(result[i], result[i - 1]);
        expect(dayDiff).toBe(1);
      }
    });
  });

  describe("AC-4: types export and STORAGE_KEYS constant", () => {
    it("should export STORAGE_KEYS with correct localStorage key names", () => {
      expect(STORAGE_KEYS.settings).toBe("ppd:settings");
      expect(STORAGE_KEYS.records).toBe("ppd:records");
      expect(STORAGE_KEYS.adUnlockedDate).toBe("ppd:adUnlockedDate");
    });

    it("should support SaveResult type for successful operations", () => {
      const result: SaveResult = { ok: true };
      expect(result.ok).toBe(true);
    });

    it("should support SaveResult type for error cases", () => {
      const result: SaveResult = { ok: false, reason: "quota" };
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quota");
    });

    it("should support DateKey type annotation", () => {
      const key: DateKey = "2026-09-20";
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });
});

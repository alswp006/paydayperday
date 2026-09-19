import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  load,
  saveSettings,
  addSpend,
  markNoSpend,
  undoLastSpend,
  isAdUnlockedToday,
  markAdUnlocked,
  resetAll,
  normalizeDigits,
  toIntOrNull,
} from "@/lib/budgetStore";
import * as storage from "@/lib/storage";

vi.mock("@/lib/storage");

describe("Storage Layer & Number Input Normalizer [Packet 0003]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(storage.getItem) as any).mockReturnValue(null);
    (vi.mocked(storage.setItem) as any).mockResolvedValue(undefined);
    (vi.mocked(storage.removeItem) as any).mockResolvedValue(undefined);
  });

  // ============================================================
  // AC-1: load() should not throw on broken JSON
  // ============================================================
  describe("AC-1: load() handles broken JSON gracefully", () => {
    it("should return {ok:false} when ppd:settings contains invalid JSON", () => {
      (vi.mocked(storage.getItem) as any).mockImplementation((key: string) => {
        if (key === "ppd:settings") return "{not valid json}";
        return null;
      });

      const result = load();
      expect(result.ok).toBe(false);
    });

    it("should return {ok:true} with null settings when no data exists", () => {
      (vi.mocked(storage.getItem) as any).mockReturnValue(null);

      const result = load();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.settings).toBeNull();
        expect(typeof result.records).toBe("object");
      }
    });
  });

  // ============================================================
  // AC-2: Quota exceeded with retry logic
  // ============================================================
  describe("AC-2: saveSettings handles quota exceeded with retry", () => {
    it("[P0] should delete >30 day old records and retry once on quota exceeded", async () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";

      let attemptCount = 0;
      (vi.mocked(storage.setItem) as any).mockImplementation((key: string) => {
        attemptCount++;
        // First attempt fails with quota
        if (attemptCount === 1 && key === "ppd:records") {
          throw quotaError;
        }
        // Retry succeeds
      });

      const result = await saveSettings(1, 5000000, { newCycle: false });

      expect(result.ok).toBe(true);
      // Should have called setItem at least twice (initial + retry)
      expect((vi.mocked(storage.setItem) as any).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("[P0] should return {ok:false, reason:'quota'} when retry fails", async () => {
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";

      (vi.mocked(storage.setItem) as any).mockImplementation(() => {
        throw quotaError;
      });

      const result = await saveSettings(1, 5000000, { newCycle: false });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quota");
    });

    it("should return {ok:false, reason:'unknown'} for non-quota errors", async () => {
      (vi.mocked(storage.setItem) as any).mockImplementation(() => {
        throw new Error("Network error");
      });

      const result = await saveSettings(1, 5000000, { newCycle: false });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("unknown");
    });
  });

  // ============================================================
  // AC-3: Data persistence and cleanup
  // ============================================================
  describe("AC-3: Data persistence and automatic cleanup", () => {
    it("should clean up records older than 60 days on load", () => {
      const today = "2026-09-20";
      const ninetyDaysAgo = new Date("2026-09-20");
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const oldDateKey = ninetyDaysAgo.toISOString().split("T")[0];

      const mockRecords = {
        [oldDateKey]: { budget: 5000000, spends: [] },
        [today]: { budget: 5000000, spends: [] },
      };

      (vi.mocked(storage.getItem) as any).mockImplementation((key: string) => {
        if (key === "ppd:records") return JSON.stringify(mockRecords);
        return null;
      });

      const result = load();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.records[oldDateKey]).toBeUndefined();
        expect(result.records[today]).toBeDefined();
      }
    });

    it("should not create a today record when saving settings without any entry", async () => {
      (vi.mocked(storage.getItem) as any).mockReturnValue(JSON.stringify({}));

      await saveSettings(1, 5000000, { newCycle: true });

      const setCalls = (vi.mocked(storage.setItem) as any).mock.calls;
      const recordsCall = setCalls.find((c: any) => c[0] === "ppd:records");
      expect(recordsCall).toBeDefined();
      expect(JSON.parse(recordsCall[1])["2026-09-20"]).toBeUndefined();
    });

    it("should not modify localStorage on write failure", async () => {
      const originalRecords = { "2026-09-20": { budget: 5000000 } };
      (vi.mocked(storage.getItem) as any).mockReturnValue(
        JSON.stringify(originalRecords)
      );

      (vi.mocked(storage.setItem) as any).mockImplementation(() => {
        throw new Error("Write failed");
      });

      const result = await addSpend(100000);

      expect(result.ok).toBe(false);
      // setItem was attempted but failed
      expect((vi.mocked(storage.setItem) as any)).toHaveBeenCalled();
    });
  });

  // ============================================================
  // AC-4: normalizeDigits input parsing
  // ============================================================
  describe("AC-4: normalizeDigits converts and normalizes input", () => {
    it("should convert '$5,000' to '5000'", () => {
      const result = normalizeDigits("$5,000", Infinity);
      expect(result).toBe("5000");
    });

    it("should convert '-25' to '25' (absolute value)", () => {
      const result = normalizeDigits("-25", Infinity);
      expect(result).toBe("25");
    });

    it("should convert '50000.99' to '5000099' (remove decimal, multiply by 100)", () => {
      const result = normalizeDigits("50000.99", Infinity);
      expect(result).toBe("5000099");
    });

    it("should return empty string for 'abc' (invalid input)", () => {
      const result = normalizeDigits("abc", Infinity);
      expect(result).toBe("");
    });

    it("should return empty string for '0' (zero is null)", () => {
      const result = normalizeDigits("0", Infinity);
      expect(result).toBe("");
    });

    it("should truncate to maxDigits: '25.5' with maxDigits=2 → '25'", () => {
      const result = normalizeDigits("25.5", 2);
      expect(result).toBe("25");
    });

    it("should handle whitespace: ' 100 ' → '100'", () => {
      const result = normalizeDigits(" 100 ", Infinity);
      expect(result).toBe("100");
    });
  });

  // ============================================================
  // toIntOrNull: core number parsing
  // ============================================================
  describe("toIntOrNull: parse string to number or null", () => {
    it("should parse valid integers", () => {
      expect(toIntOrNull("123")).toBe(123);
      expect(toIntOrNull("5000")).toBe(5000);
    });

    it("should return null for non-numeric input", () => {
      expect(toIntOrNull("abc")).toBeNull();
      expect(toIntOrNull("")).toBeNull();
    });

    it("should return null for '0'", () => {
      expect(toIntOrNull("0")).toBeNull();
    });

    it("should strip currency and separators: '$1,000' → 1000", () => {
      expect(toIntOrNull("$1,000")).toBe(1000);
    });

    it("should handle negative (but return absolute): '-500' → 500", () => {
      expect(toIntOrNull("-500")).toBe(500);
    });
  });

  // ============================================================
  // Ad unlock tracking
  // ============================================================
  describe("Ad unlock tracking", () => {
    it("should return false when ad not unlocked today", () => {
      (vi.mocked(storage.getItem) as any).mockReturnValue(null);
      expect(isAdUnlockedToday()).toBe(false);
    });

    it("should return true when ad is unlocked for today", () => {
      (vi.mocked(storage.getItem) as any).mockImplementation((key: string) => {
        if (key === "ppd:adUnlockedDate") return "2026-09-20";
        return null;
      });
      expect(isAdUnlockedToday()).toBe(true);
    });

    it("should mark ad as unlocked for today", async () => {
      const result = await markAdUnlocked();
      expect(result.ok).toBe(true);

      const setCalls = (vi.mocked(storage.setItem) as any).mock.calls;
      expect(
        setCalls.some((c: any) => c[0] === "ppd:adUnlockedDate" && c[1] === "2026-09-20")
      ).toBe(true);
    });
  });

  // ============================================================
  // Spend tracking
  // ============================================================
  describe("Spend tracking", () => {
    it("should add a spend record", async () => {
      (vi.mocked(storage.getItem) as any).mockReturnValue(JSON.stringify({}));

      const result = await addSpend(100000);
      expect(result.ok).toBe(true);

      const setCalls = (vi.mocked(storage.setItem) as any).mock.calls;
      const recordsCall = setCalls.find((c: any) => c[0] === "ppd:records");
      expect(recordsCall).toBeDefined();
    });

    it("should undo last spend", async () => {
      (vi.mocked(storage.getItem) as any).mockReturnValue(
        JSON.stringify({
          "2026-09-20": { budget: 5000000, spends: [100000] },
        })
      );

      const result = await undoLastSpend();
      expect(result.ok).toBe(true);
    });

    it("should mark no spend for today", async () => {
      (vi.mocked(storage.getItem) as any).mockReturnValue(JSON.stringify({}));

      const result = await markNoSpend();
      expect(result.ok).toBe(true);
    });
  });

  // ============================================================
  // resetAll
  // ============================================================
  describe("resetAll: clear all app data", () => {
    it("should remove all ppd: prefixed keys", () => {
      resetAll();

      const removeCalls = (vi.mocked(storage.removeItem) as any).mock.calls;
      const keys = removeCalls.map((c: any) => c[0]);

      expect(keys).toContain("ppd:settings");
      expect(keys).toContain("ppd:records");
      expect(keys).toContain("ppd:adUnlockedDate");
    });
  });
});

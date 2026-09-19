import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { BudgetSettings, RecordMap } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ input: null, setInput: vi.fn() }),
}));

vi.mock("@toss/tds-mobile", async () => {
  const R = await import("react");
  const h = R.createElement;
  return {
    Button: ({ children, onClick, disabled, loading, display, variant, size, color, ...p }: any) =>
      h("button", { type: "button", onClick, disabled: disabled || undefined, ...p }, children),
    FixedBottomCTA: ({ children, onClick, disabled, loading, ...p }: any) =>
      h("button", { type: "button", onClick, disabled: disabled || undefined, ...p }, children),
    ListRow: Object.assign(
      ({ contents, right, onClick }: any) => h("div", { role: "listitem", onClick }, contents, right),
      {
        Texts: ({ top, bottom }: any) =>
          h(R.Fragment, null, h("span", null, top), h("span", null, bottom)),
      },
    ),
    Paragraph: { Text: ({ children, typography, ...p }: any) => h("span", { ...p }, children) },
    Spacing: () => h("div"),
    Border: () => h("hr"),
    Skeleton: () => h("div", { "data-skeleton": "true" }),
    Top: Object.assign(({ title, children }: any) => h("nav", null, title, children), {
      TitleParagraph: ({ children }: any) => h("h1", null, children),
    }),
    Asset: { ContentIcon: () => h("span"), Icon: () => h("span") },
    Toast: ({ open, text }: any) => (open ? h("div", { role: "status" }, text) : null),
  };
});

// SDK: 광고 요청 횟수 기록
const sdk = vi.hoisted(() => ({ load: vi.fn(), show: vi.fn() }));
vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
  Analytics: { screen: vi.fn(), click: vi.fn(), impression: vi.fn() },
  loadFullScreenAd: (o: any) => {
    sdk.load(o);
    o.onEvent?.({ type: "loaded" });
  },
  showFullScreenAd: (o: any) => {
    sdk.show(o);
    o.onEvent?.({ type: "rewarded" });
  },
}));

// remainingDays 1 분기 검증용: 켜면 computeDaily 결과를 하루 남은 상태로 덮어쓴다
const calc = vi.hoisted(() => ({ lastDay: false }));
vi.mock("@/lib/calculator", async () => {
  const actual = await vi.importActual<typeof import("@/lib/calculator")>("@/lib/calculator");
  return {
    ...actual,
    computeDaily: (...a: Parameters<typeof actual.computeDaily>) => {
      const r = actual.computeDaily(...a);
      return calc.lastDay ? { ...r, remainingDays: 1, tomorrowBudget: null } : r;
    },
  };
});

import Result from "@/pages/Result";

const TODAY = "2026-09-20";
const settings: BudgetSettings = {
  paydayDay: 24,
  cycleBudget: 300000,
  cycleStart: "2026-08-25",
  cycleEnd: "2026-09-25",
};

function seed(opts: { settings?: BudgetSettings | null; records?: RecordMap; unlocked?: string }) {
  if (opts.settings !== null) {
    localStorage.setItem("ppd:settings", JSON.stringify(opts.settings ?? settings));
  }
  if (opts.records) localStorage.setItem("ppd:records", JSON.stringify(opts.records));
  if (opts.unlocked) localStorage.setItem("ppd:adUnlockedDate", JSON.stringify(opts.unlocked));
}

// 어제 1만 원 지출 → 오늘 예산 (300000-10000)/5 = 58,000 / 내일 예산 (300000-10000-spent)/4 를 100원 내림
const yesterday = { date: "2026-09-19", entries: [10000], budget: 60000 };
const recordsWith = (entries: number[]): RecordMap => ({
  "2026-09-19": yesterday,
  [TODAY]: { date: TODAY, entries, budget: 58000 },
});

const renderResult = (state?: unknown) =>
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: "/result", state }] },
      React.createElement(Result),
    ),
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 20, 12, 0, 0));
  calc.lastDay = false;
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Result Page", () => {
  it("AC-1[P0]: settings가 없으면 홈으로 replace 이동하고 광고·결산을 렌더하지 않는다", () => {
    seed({ settings: null, records: recordsWith([45000]) });
    renderResult();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(sdk.load).toHaveBeenCalledTimes(0);
    expect(screen.queryByText("광고 보고 확인하기")).toBeNull();
    expect(screen.queryByText(formatCurrency(58000))).toBeNull();
  });

  it("AC-1[P0]: today ≥ cycleEnd(사이클 만료)면 홈으로 replace 이동하고 광고를 요청하지 않는다", () => {
    seed({ settings: { ...settings, cycleEnd: TODAY }, records: recordsWith([45000]), unlocked: TODAY });
    renderResult();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(sdk.load).toHaveBeenCalledTimes(0);
    expect(screen.queryByText(formatCurrency(58000))).toBeNull();
    expect(screen.queryByText("광고 보고 확인하기")).toBeNull();
  });

  it("AC-2[P0]: 오늘 기록이 없으면 route state가 있어도 안내와 '홈으로'만 보이고 광고·unlock 저장이 없다", () => {
    seed({ records: { "2026-09-19": yesterday } });
    const staleState = {
      result: { remainingDays: 5, todayBudget: 58000, todaySpent: 45000, todayLeft: 13000, cycleOverspent: 0, tomorrowBudget: 61200, yesterdayCarry: 50000, week: [], streak: 3 },
      input: { settings, todaySpent: 45000 },
    };
    renderResult(staleState);
    expect(
      screen.getByText("오늘 기록이 아직 없어요. 지출이나 무지출을 기록하면 결산을 볼 수 있어요"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["홈으로"]);
    expect(sdk.load).toHaveBeenCalledTimes(0);
    expect(localStorage.getItem("ppd:adUnlockedDate")).toBeNull();
    expect(screen.queryByText(formatCurrency(58000))).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-3: adUnlockedDate가 오늘이면 광고 요청 없이 결산이 바로 보인다(오프라인 포함)", () => {
    seed({ records: recordsWith([45000]), unlocked: TODAY });
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    renderResult();
    expect(sdk.load).toHaveBeenCalledTimes(0);
    expect(screen.queryByText("광고 보고 확인하기")).toBeNull();
    expect(screen.queryByText("인터넷 연결을 확인한 뒤 다시 시도해 주세요")).toBeNull();
    expect(screen.getByText(formatCurrency(58000))).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(7); // WeekStreak
  });

  it("AC-3: 광고를 끝까지 보면 결산이 처음 마운트될 때 adUnlockedDate=오늘이 저장된다", () => {
    seed({ records: recordsWith([45000]) });
    renderResult();
    expect(sdk.load).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(formatCurrency(58000))).toBeNull();
    expect(localStorage.getItem("ppd:adUnlockedDate")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "광고 보고 확인하기" }));
    expect(sdk.show).toHaveBeenCalledTimes(1);
    expect(screen.getByText(formatCurrency(58000))).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ppd:adUnlockedDate")!)).toBe(TODAY);
  });

  it("AC-4: 남긴 돈 케이스 — 오늘 예산·쓴 돈·남긴 돈·내일 예산·월급날 D-day를 formatCurrency로 표시한다", () => {
    seed({ records: recordsWith([45000]), unlocked: TODAY });
    renderResult();
    expect(screen.getByText(formatCurrency(58000))).toBeInTheDocument(); // 오늘 예산
    expect(screen.getByText(formatCurrency(45000))).toBeInTheDocument(); // 오늘 쓴 돈
    expect(screen.getByText(/남긴 돈/)).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(13000))).toBeInTheDocument(); // 58000-45000
    expect(screen.getByText(formatCurrency(61200))).toBeInTheDocument(); // 내일 예산
    expect(screen.getByText(/D-5/)).toBeInTheDocument();
    expect(screen.queryByText(/초과한 돈/)).toBeNull();
  });

  it("AC-4: 초과 케이스 — '초과한 돈'과 초과 금액이 표시된다", () => {
    seed({ records: recordsWith([70000]), unlocked: TODAY });
    renderResult();
    expect(screen.getByText(/초과한 돈/)).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(12000))).toBeInTheDocument(); // 70000-58000
    expect(screen.getByText(formatCurrency(55000))).toBeInTheDocument(); // 내일 예산 220000/4
    expect(screen.queryByText(/남긴 돈/)).toBeNull();
  });

  it("AC-4: remainingDays 1이면 내일 예산 대신 '내일은 월급날이에요'", () => {
    calc.lastDay = true;
    seed({ records: recordsWith([45000]), unlocked: TODAY });
    renderResult();
    expect(screen.getByText("내일은 월급날이에요")).toBeInTheDocument();
    expect(screen.queryByText(formatCurrency(61200))).toBeNull();
  });

  it("AC-3: route state가 있어도 표시값은 localStorage 기준으로 다시 계산한다", () => {
    seed({ records: recordsWith([45000]), unlocked: TODAY });
    renderResult({
      result: { remainingDays: 9, todayBudget: 99900, todaySpent: 1, todayLeft: 99899, cycleOverspent: 0, tomorrowBudget: 1000, yesterdayCarry: null, week: [], streak: 0 },
      input: { settings, todaySpent: 1 },
    });
    expect(screen.getByText(formatCurrency(58000))).toBeInTheDocument();
    expect(screen.queryByText(formatCurrency(99900))).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import type { BudgetSettings, RecordMap, SaveResult } from "@/lib/types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ input: null, setInput: vi.fn() }),
}));
vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
  Analytics: { screen: vi.fn(), click: vi.fn(), impression: vi.fn() },
}));

// ── budgetStore mock: 가변 스냅샷 + 호출 기록 ──
type Snap = { ok: true; settings: BudgetSettings | null; records: RecordMap } | { ok: false };
const store = vi.hoisted(() => ({
  snap: { ok: true, settings: null, records: {} } as any,
  saveSettings: vi.fn(),
  addSpend: vi.fn(),
  markNoSpend: vi.fn(),
  undoLastSpend: vi.fn(),
  resetAll: vi.fn(),
}));
vi.mock("@/lib/budgetStore", async () => ({
  ...(await vi.importActual<object>("@/lib/budgetStore")),
  load: () => store.snap,
  saveSettings: (...a: unknown[]) => store.saveSettings(...a),
  addSpend: (...a: unknown[]) => store.addSpend(...a),
  markNoSpend: (...a: unknown[]) => store.markNoSpend(...a),
  undoLastSpend: (...a: unknown[]) => store.undoLastSpend(...a),
  resetAll: (...a: unknown[]) => store.resetAll(...a),
}));

// ── 자식 컴포넌트 스텁: Home의 배선(props 호출·토스트·상태 전환)만 검증 ──
vi.mock("@/components/SetupSheet", async () => {
  const R = await import("react");
  return {
    default: ({ open, onSave }: any) =>
      open
        ? R.createElement(
            "div",
            { role: "dialog" },
            R.createElement("button", { onClick: () => onSave(24, 300000) }, "설정 저장"),
          )
        : null,
  };
});
vi.mock("@/components/SpendInput", async () => {
  const R = await import("react");
  return {
    default: ({ onRecord }: any) =>
      R.createElement("button", { onClick: () => onRecord(5000) }, "5천원 기록"),
  };
});

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
    Asset: {
      ContentIcon: () => h("span"),
      Icon: () => h("span"),
    },
    Toast: ({ open, text }: any) => (open ? h("div", { role: "status" }, text) : null),
    AlertDialog: Object.assign(
      ({ open, title, description, alertButton }: any) =>
        open ? h("div", { role: "alertdialog" }, h("h2", null, title), h("p", null, description), alertButton) : null,
      { AlertButton: ({ children, onClick }: any) => h("button", { onClick }, children) },
    ),
  };
});

import Home from "@/pages/Home";
import TodayDashboard from "@/components/TodayDashboard";

const TODAY = "2026-09-20";
const settings: BudgetSettings = {
  paydayDay: 24,
  cycleBudget: 300000,
  cycleStart: "2026-08-25",
  cycleEnd: "2026-09-25",
};
const ok: SaveResult = { ok: true };
const renderHome = () => render(React.createElement(MemoryRouter, null, React.createElement(Home)));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 20, 12, 0, 0));
  store.snap = { ok: true, settings: null, records: {} };
  store.saveSettings.mockReturnValue(ok);
  store.addSpend.mockReturnValue(ok);
  store.markNoSpend.mockReturnValue(ok);
  store.undoLastSpend.mockReturnValue(ok);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Home Page & Today Dashboard", () => {
  it("UX(P4): 상단 타이틀은 콘솔 등록 한국어 앱 이름(매니페스트 koreanName)이다 — 영어 코드명 아님", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../artifacts/apps-in-toss-manifest.json"), "utf8"),
    );
    expect(manifest.koreanName).toBe("월급계기판");
    renderHome();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("heading", { level: 1 }).textContent).toBe(manifest.koreanName);
    expect(screen.queryByText("PaydayPerDay")).toBeNull();
  });

  it("AC-1[P0]: 설정이 없으면 EmptyState와 '시작하기'가 보이고, 저장하면 Toast 후 대시보드로 바뀐다", () => {
    renderHome();
    expect(screen.getByText("월급날까지 하루 예산을 계산해 드릴게요")).toBeInTheDocument();
    expect(screen.queryByText("오늘 결산 보기")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "시작하기" }));
    // 저장 시점에 스토어가 새 설정을 들고 있다
    store.saveSettings.mockImplementation(() => {
      store.snap = { ok: true, settings, records: { [TODAY]: { date: TODAY, entries: [], budget: 60000 } } };
      return ok;
    });
    fireEvent.click(screen.getByRole("button", { name: "설정 저장" }));

    expect(store.saveSettings).toHaveBeenCalledWith(24, 300000, { newCycle: true });
    expect(screen.getByText("예산을 설정했어요")).toBeInTheDocument();
    expect(screen.getByText("D-5")).toBeInTheDocument();
    expect(screen.queryByText("월급날까지 하루 예산을 계산해 드릴게요")).toBeNull();
  });

  it("AC-2[P0]: today ≥ cycleEnd면 만료 안내와 '새로 설정하기'만 보이고 '예산 수정'·고정 CTA는 숨겨진다", () => {
    store.snap = {
      ok: true,
      settings: { ...settings, cycleEnd: "2026-09-20" },
      records: {},
    };
    renderHome();
    expect(screen.getByText("월급날이 지났어요. 이번 달 예산을 새로 설정해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새로 설정하기" })).toBeInTheDocument();
    expect(screen.queryByText("예산 수정")).toBeNull();
    expect(screen.queryByText("오늘 결산 보기")).toBeNull();
  });

  it("AC-2[P0]: 저장소 JSON이 깨졌으면 '다시 시도'와 '초기화'(AlertDialog)가 보이고, 초기화하면 resetAll이 불린다", () => {
    store.snap = { ok: false };
    renderHome();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryByText("오늘 결산 보기")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    store.snap = { ok: true, settings: null, records: {} };
    fireEvent.click(within(dialog).getByRole("button", { name: "초기화" }));
    expect(store.resetAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText("월급날까지 하루 예산을 계산해 드릴게요")).toBeInTheDocument();
  });

  it("AC-3[P0]: D-day 문구 — remainingDays 5는 'D-5', 1은 '내일 월급날이에요'", () => {
    const base = { todayBudget: 60000, todaySpent: 0, todayLeft: 60000, cycleOverspent: 0, tomorrowBudget: 60000, yesterdayCarry: null };
    const { unmount } = render(
      React.createElement(TodayDashboard, { result: { ...base, remainingDays: 5 }, cycleEnd: "2026-09-25" }),
    );
    expect(screen.getByText("D-5")).toBeInTheDocument();
    expect(screen.queryByText("내일 월급날이에요")).toBeNull();
    unmount();

    render(
      React.createElement(TodayDashboard, {
        result: { ...base, remainingDays: 1, tomorrowBudget: null },
        cycleEnd: "2026-09-21",
      }),
    );
    expect(screen.getByText("내일 월급날이에요")).toBeInTheDocument();
    expect(screen.queryByText("D-1")).toBeNull();
  });

  it("AC-3[P0]: todayLeft<0이면 '5,000원 초과했어요'를 빨강 토큰으로, cycleOverspent>0이면 사이클 초과 문구를 보여 준다", () => {
    render(
      React.createElement(TodayDashboard, {
        result: {
          remainingDays: 5,
          todayBudget: 60000,
          todaySpent: 65000,
          todayLeft: -5000,
          cycleOverspent: 12000,
          tomorrowBudget: 40000,
          yesterdayCarry: -3000,
        },
        cycleEnd: "2026-09-25",
      }),
    );
    const over = screen.getByText(/5,000원 초과했어요/);
    expect(over.closest('[style*="red"],[color*="red"]')).not.toBeNull();
    expect(screen.getByText("이번 달 예산을 12,000원 넘겼어요")).toBeInTheDocument();
  });

  it("AC-3[P1]: 넘치지 않았으면 초과 문구는 없다", () => {
    render(
      React.createElement(TodayDashboard, {
        result: {
          remainingDays: 5,
          todayBudget: 60000,
          todaySpent: 10000,
          todayLeft: 50000,
          cycleOverspent: 0,
          tomorrowBudget: 60000,
          yesterdayCarry: null,
        },
        cycleEnd: "2026-09-25",
      }),
    );
    expect(screen.queryByText(/초과했어요/)).toBeNull();
    expect(screen.queryByText(/넘겼어요/)).toBeNull();
    expect(screen.getByText(/10,000원/)).toBeInTheDocument();
  });

  it("AC-4[P0]: records[today]가 없으면 '오늘 결산 보기'가 비활성화되고, 있으면 /result로 state와 함께 이동한다", () => {
    store.snap = { ok: true, settings, records: {} };
    const first = renderHome();
    expect(screen.getByRole("button", { name: "오늘 결산 보기" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "오늘 결산 보기" }));
    expect(mockNavigate).not.toHaveBeenCalled();
    first.unmount();

    store.snap = {
      ok: true,
      settings,
      records: { [TODAY]: { date: TODAY, entries: [10000], budget: 60000 } },
    };
    renderHome();
    const cta = screen.getByRole("button", { name: "오늘 결산 보기" });
    expect(cta).toBeEnabled();
    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, opts] = mockNavigate.mock.calls[0];
    expect(path).toBe("/result");
    expect(opts.state.result).toMatchObject({ remainingDays: 5, todayBudget: 60000, todaySpent: 10000, todayLeft: 50000 });
    expect(opts.state.result).toHaveProperty("week");
    expect(opts.state.result).toHaveProperty("streak");
    expect(opts.state.input).toEqual({ settings, todaySpent: 10000 });
  });

  it("AC-4[P0]: 저장 실패 reason에 따라 quota/unknown Toast 문구가 다르다", () => {
    store.snap = { ok: true, settings, records: {} };
    store.addSpend.mockReturnValueOnce({ ok: false, reason: "quota" });
    const first = renderHome();
    fireEvent.click(screen.getByRole("button", { name: "5천원 기록" }));
    expect(screen.getByText("저장 공간이 부족해요. 기록을 초기화하면 다시 저장할 수 있어요")).toBeInTheDocument();
    expect(screen.queryByText("저장에 실패했어요. 다시 시도해 주세요")).toBeNull();
    first.unmount();

    store.addSpend.mockReturnValueOnce({ ok: false, reason: "unknown" });
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "5천원 기록" }));
    expect(screen.getByText("저장에 실패했어요. 다시 시도해 주세요")).toBeInTheDocument();
    expect(screen.queryByText("저장 공간이 부족해요. 기록을 초기화하면 다시 저장할 수 있어요")).toBeNull();
    expect(store.addSpend).toHaveBeenCalledWith(5000);
  });
});

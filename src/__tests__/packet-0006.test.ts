import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WeekDay } from "@/lib/types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ input: null, setInput: vi.fn() }),
}));
vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, display: _d, variant: _v, size: _s, ...p }: any) =>
    React.createElement("button", { onClick, ...p }, children),
  Paragraph: {
    Text: ({ children, typography: _t, ...p }: any) => React.createElement("span", p, children),
  },
  Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),
}));

// SDK: 광고 요청 횟수 기록 + 시나리오 전환
const sdk = vi.hoisted(() => ({
  load: vi.fn(),
  show: vi.fn(),
  mode: "ok" as "ok" | "loadFail" | "dismissed",
}));
vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
  Analytics: { screen: vi.fn(), click: vi.fn(), impression: vi.fn() },
  loadFullScreenAd: (o: any) => {
    sdk.load(o);
    if (sdk.mode === "loadFail") o.onError?.(new Error("load failed"));
    else o.onEvent?.({ type: "loaded" });
  },
  showFullScreenAd: (o: any) => {
    sdk.show(o);
    if (sdk.mode === "dismissed") o.onEvent?.({ type: "dismissed" });
    else o.onEvent?.({ type: "rewarded" });
  },
}));

import { WeekStreak } from "@/components/WeekStreak";
import { ResultAdGate } from "@/components/ResultAdGate";

const week: WeekDay[] = [
  { date: "2026-09-14", status: "success" },
  { date: "2026-09-15", status: "success" },
  { date: "2026-09-16", status: "fail" },
  { date: "2026-09-17", status: "none" },
  { date: "2026-09-18", status: "success" },
  { date: "2026-09-19", status: "future" },
  { date: "2026-09-20", status: "future" },
];

function setOnline(v: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value: v, configurable: true });
}

function renderGate(unlocked = false, onHome = vi.fn()) {
  const utils = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        ResultAdGate,
        { unlocked, onHome },
        React.createElement("div", null, "오늘 예산 12,000원"),
      ),
    ),
  );
  return { ...utils, onHome };
}

beforeEach(() => {
  sdk.mode = "ok";
  setOnline(true);
});
afterEach(() => setOnline(true));

describe("Week Streak & Result Ad Gate Components", () => {
  it("AC-1: 7칸 각각 role=img + 상태 aria-label, 44px 이상, 숫자는 천 단위 표기", () => {
    render(React.createElement(WeekStreak, { week, streak: 1200 }));
    const cells = screen.getAllByRole("img");
    expect(cells).toHaveLength(7);
    const labels = cells.map((c) => c.getAttribute("aria-label"));
    expect(labels.map((l) => l!.split(" ").slice(1).join(" "))).toEqual([
      "지킴", "지킴", "초과", "기록 없음", "지킴", "예정", "예정",
    ]);
    expect(labels[0]).toMatch(/^월(요일)? 지킴$/);
    expect(labels[2]).toMatch(/^수(요일)? 초과$/);
    for (const c of cells) {
      expect(parseInt(c.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(c.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    }
    expect(screen.getByText("1,200일 연속 예산 지킴")).toBeInTheDocument();
    expect(screen.getByText("이번 주 3/7일 준수")).toBeInTheDocument();
  });

  it("AC-1: 기록이 없는 주(streak 0, 성공 0)는 0으로 표시", () => {
    const empty = week.map((d) => ({ ...d, status: "none" as const }));
    render(React.createElement(WeekStreak, { week: empty, streak: 0 }));
    expect(screen.getAllByRole("img")).toHaveLength(7);
    expect(screen.getByText("0일 연속 예산 지킴")).toBeInTheDocument();
    expect(screen.getByText("이번 주 0/7일 준수")).toBeInTheDocument();
  });

  it("AC-2[P0]: 오프라인이면 광고를 요청하지 않고 안내·다시 시도·홈으로를 보여 준다", () => {
    setOnline(false);
    const { onHome } = renderGate(false);
    expect(sdk.load).toHaveBeenCalledTimes(0);
    expect(screen.getByText("인터넷 연결을 확인한 뒤 다시 시도해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/오늘 예산/)).toBeNull();
  });

  it("AC-2: unlocked=true면 온라인 여부와 무관하게 children을 바로 렌더하고 광고를 요청하지 않는다", () => {
    setOnline(false);
    renderGate(true);
    expect(screen.getByText("오늘 예산 12,000원")).toBeInTheDocument();
    expect(sdk.load).toHaveBeenCalledTimes(0);
  });

  it("AC-3[P0]: 광고 로드 실패 시 안내 문구가 보이고 결산은 0건", () => {
    sdk.mode = "loadFail";
    renderGate(false);
    expect(
      screen.getByText("광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요"),
    ).toBeInTheDocument();
    expect(screen.queryAllByText(/오늘 예산/)).toHaveLength(0);
  });

  it("AC-3[P0]: 광고를 닫으면 안내와 '다시 보기'가 보이고 결산은 0건", () => {
    sdk.mode = "dismissed";
    renderGate(false);
    fireEvent.click(screen.getByRole("button", { name: /광고 보고 확인하기/ }));
    expect(sdk.show).toHaveBeenCalledTimes(1);
    expect(screen.getByText("광고를 끝까지 보면 오늘 결산을 볼 수 있어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 보기" })).toBeInTheDocument();
    expect(screen.queryAllByText(/오늘 예산/)).toHaveLength(0);
  });

  it("AC-4[P0]: 광고 완료 전에는 children 미마운트, 완료 후에만 마운트", () => {
    renderGate(false);
    expect(sdk.load).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByText(/오늘 예산/)).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /광고 보고 확인하기/ }));
    expect(screen.getByText("오늘 예산 12,000원")).toBeInTheDocument();
  });

  it("AC-4[P0]: 자동 재시도 없음 — 시간이 지나도 재요청 0회, 버튼을 눌러야 재요청", () => {
    vi.useFakeTimers();
    sdk.mode = "loadFail";
    renderGate(false);
    expect(sdk.load).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(sdk.load).toHaveBeenCalledTimes(1);

    const retry = screen.getAllByRole("button").find((b) => /다시/.test(b.textContent ?? ""))!;
    sdk.mode = "ok";
    fireEvent.click(retry);
    expect(sdk.load).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("AC-4: 오프라인에서 다시 시도해도 여전히 오프라인이면 광고 요청 0회, 온라인 복귀 후 누르면 1회", () => {
    setOnline(false);
    renderGate(false);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(sdk.load).toHaveBeenCalledTimes(0);
    expect(screen.getByText("인터넷 연결을 확인한 뒤 다시 시도해 주세요")).toBeInTheDocument();
    setOnline(true);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(sdk.load).toHaveBeenCalledTimes(1);
  });
});

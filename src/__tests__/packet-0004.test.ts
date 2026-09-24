import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
}));
vi.mock("@toss/tds-mobile", async () => {
  const R = await import("react");
  const h = R.createElement;
  return {
    // header 슬롯은 TDS처럼 children과 분리해 렌더한다(제목 인셋은 BottomSheet.Header가 준다).
    BottomSheet: Object.assign(
      ({ open, header, cta, children }: any) =>
        open
          ? h(
              "div",
              { role: "dialog" },
              header ? h("header", { "data-testid": "sheet-header" }, header) : null,
              children,
              cta ? h("footer", { "data-testid": "sheet-cta" }, cta) : null,
            )
          : null,
      {
        Header: ({ children }: any) => h("h2", null, children),
        CTA: ({ children, onClick, disabled, ...p }: any) =>
          h("button", { type: "button", onClick, disabled: disabled || undefined, ...p }, children),
      },
    ),
    // TDS labelOption 동작 모사(설치본 d.ts): 기본 'appear'는 value가 있을 때만 라벨, 'sustain'은 항상 라벨.
    TextField: R.forwardRef(
      ({ label, labelOption, help, hasError, variant, suffix, prefix, ...props }: any, ref: any) =>
        h(
          "div",
          null,
          label && (labelOption === "sustain" || props.value) ? h("label", null, label) : null,
          h("input", { ref, ...props }),
          help ? h("span", { "data-help": hasError ? "error" : "info" }, help) : null,
        ),
    ),
    // TDS Chip = 그룹 컨테이너(div), ChipItem = 개별 칩(button). Chip을 칩마다 쓰면 버튼이 생기지 않는다.
    Chip: ({ children }: any) => h("div", { "data-testid": "chip-group" }, children),
    ChipItem: ({ children, onClick, selected, disabled, ...p }: any) =>
      h("button", { type: "button", "data-selected": selected ? "true" : "false", onClick, ...p }, children),
    Button: ({ children, onClick, disabled, loading, display, variant, size, color, ...props }: any) =>
      h("button", { type: "button", onClick, disabled: disabled || undefined, ...props }, children),
    FixedBottomCTA: ({ children, onClick, disabled }: any) =>
      h("button", { type: "button", onClick, disabled: disabled || undefined }, children),
    Paragraph: { Text: ({ children }: any) => h("span", null, children) },
    Spacing: () => h("div"),
    Border: () => h("hr"),
  };
});

import SetupSheet from "@/components/SetupSheet";
import SpendInput from "@/components/SpendInput";
import { formatCurrency } from "@/lib/utils";

const wrap = (el: React.ReactElement) => render(React.createElement(MemoryRouter, null, el));

function renderSheet(onSave = vi.fn(() => ({ ok: true })), onClose = vi.fn()) {
  wrap(React.createElement(SetupSheet, { open: true, onSave, onClose }));
  return { onSave, onClose };
}
const payday = () => screen.getByLabelText(/월급날/) as HTMLInputElement;
const total = () => screen.getByLabelText(/총액/) as HTMLInputElement;
const saveBtn = () => screen.getByRole("button", { name: /저장/ }) as HTMLButtonElement;

function renderSpend(over: Record<string, any> = {}) {
  const props = {
    entriesCount: 0,
    onRecord: vi.fn(() => ({ ok: true })),
    onNoSpend: vi.fn(() => ({ ok: true })),
    onUndo: vi.fn(() => ({ ok: true })),
    onToast: vi.fn(),
    ...over,
  };
  wrap(React.createElement(SpendInput, props as any));
  return props;
}
const spendField = () => screen.getByLabelText(/지출/) as HTMLInputElement;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Setup Sheet & Spend Input Components", () => {
  it("AC-1[P0]: 월급날 0/32와 총액 999는 범위 help를 보이고 저장을 막는다", () => {
    renderSheet();
    fireEvent.change(total(), { target: { value: "3000000" } });
    fireEvent.change(payday(), { target: { value: "32" } });
    expect(screen.getByText("1~31 사이로 입력해 주세요")).toBeInTheDocument();
    expect(saveBtn().disabled).toBe(true);

    fireEvent.change(payday(), { target: { value: "0" } });
    expect(screen.getByText("1~31 사이로 입력해 주세요")).toBeInTheDocument();
    expect(saveBtn().disabled).toBe(true);

    fireEvent.change(payday(), { target: { value: "25" } });
    fireEvent.change(total(), { target: { value: "999" } });
    expect(screen.getByText("1,000원 ~ 100,000,000원 사이로 입력해 주세요")).toBeInTheDocument();
    expect(saveBtn().disabled).toBe(true);
  });

  it("AC-1[P0]: 말일 Chip은 월급날을 31로 채우고 유효 입력이면 저장이 가능하다", () => {
    const { onSave } = renderSheet();
    fireEvent.change(total(), { target: { value: "3000000" } });
    fireEvent.click(screen.getByRole("button", { name: "말일" }));
    expect(payday().value).toBe("31");
    expect(saveBtn().disabled).toBe(false);
    fireEvent.click(saveBtn());
    expect(onSave).toHaveBeenCalledWith(31, 3000000);
  });

  it("UX(P1): 빈 칸에서도 두 필드의 라벨이 보인다(placeholder만으로 구분하지 않는다)", () => {
    renderSheet();
    expect(payday().value).toBe("");
    expect(total().value).toBe("");
    expect(screen.getByText("월급날")).toBeInTheDocument();
    expect(screen.getByText("이번 달 쓸 수 있는 총액")).toBeInTheDocument();
    expect(payday().getAttribute("placeholder")).toBe("예: 25");
    expect(total().getAttribute("placeholder")).toBe("예: 3,000,000");
  });

  it("UX(P2): 월급날 칩은 한 그룹 안의 개별 버튼이고, 입력된 월급날과 같은 칩만 선택 상태다", () => {
    renderSheet();
    const group = screen.getByTestId("chip-group");
    const chips = within(group).getAllByRole("button");
    expect(chips.map((c) => c.textContent)).toEqual(["10일", "15일", "21일", "25일", "말일"]);
    const selectedLabels = () =>
      chips.filter((c) => c.getAttribute("data-selected") === "true").map((c) => c.textContent);
    expect(selectedLabels()).toEqual([]);

    fireEvent.click(within(group).getByRole("button", { name: "25일" }));
    expect(payday().value).toBe("25");
    expect(selectedLabels()).toEqual(["25일"]);
    expect(within(group).getByRole("button", { name: "25일" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "10일" }).getAttribute("aria-pressed")).toBe("false");

    // 직접 입력도 선택 상태에 반영된다 — 칩에 없는 날짜면 아무것도 선택되지 않는다
    fireEvent.change(payday(), { target: { value: "10" } });
    expect(selectedLabels()).toEqual(["10일"]);
    fireEvent.change(payday(), { target: { value: "24" } });
    expect(selectedLabels()).toEqual([]);
    fireEvent.change(payday(), { target: { value: "31" } });
    expect(selectedLabels()).toEqual(["말일"]);
  });

  it("UX(P2): 기존 설정으로 열면 저장된 월급날 칩이 선택돼 있다", () => {
    wrap(
      React.createElement(SetupSheet, {
        open: true,
        initial: { paydayDay: 15, cycleBudget: 2000000 },
        onSave: vi.fn(() => ({ ok: true })),
        onClose: vi.fn(),
      }),
    );
    expect(screen.getByRole("button", { name: "15일" }).getAttribute("data-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "25일" }).getAttribute("data-selected")).toBe("false");
  });

  it("UX(P3): 시트 제목은 BottomSheet header 슬롯(BottomSheet.Header)으로 렌더된다", () => {
    renderSheet();
    const header = screen.getByTestId("sheet-header");
    expect(within(header).getByRole("heading", { name: "예산 설정" })).toBeInTheDocument();
    // 본문(children)에 제목이 중복으로 남아 있지 않다
    expect(screen.getAllByText("예산 설정")).toHaveLength(1);
  });

  it("UX: 저장 버튼은 BottomSheet cta 슬롯(BottomSheet.CTA)에 있다 — 본문에 맨 버튼으로 두면 시트 가장자리에 붙는다", () => {
    renderSheet();
    const cta = screen.getByTestId("sheet-cta");
    expect(within(cta).getByRole("button", { name: /저장/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /저장/ })).toHaveLength(1);
  });

  it("AC-2[P0]: 총액에 '$5,000'을 붙여넣으면 '5,000'으로 보이고 두 필드는 numeric + aria-label", () => {
    renderSheet();
    fireEvent.change(total(), { target: { value: "$5,000" } });
    expect(total().value).toBe("5,000");
    expect(total().getAttribute("inputmode")).toBe("numeric");
    expect(payday().getAttribute("inputmode")).toBe("numeric");
    expect(total().getAttribute("aria-label")).toMatch(/총액/);
    expect(payday().getAttribute("aria-label")).toMatch(/월급날/);
  });

  it("AC-2: 포커스되면 scrollIntoView를 호출한다", () => {
    renderSheet();
    fireEvent.focus(total());
    fireEvent.focus(payday());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("AC-3[P0]: 지출 Chip 합계가 10,000,000원을 넘으면 help가 보이고 기록하기가 비활성화된다", () => {
    const props = renderSpend();
    fireEvent.change(spendField(), { target: { value: "9990000" } });
    expect(screen.getByRole("button", { name: "기록하기" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /30,000/ }));
    expect(spendField().value).toBe("10,020,000");
    expect(screen.getByText("1원 ~ 10,000,000원 사이로 입력해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기록하기" })).toBeDisabled();
    expect(props.onRecord).not.toHaveBeenCalled();
  });

  it("AC-3: 기록 성공 시 입력 칸을 비우고 토스트를 띄운다", () => {
    const props = renderSpend();
    fireEvent.change(spendField(), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    expect(props.onRecord).toHaveBeenCalledWith(5000);
    expect(spendField().value).toBe("");
    expect(props.onToast).toHaveBeenCalledWith(`${formatCurrency(5000)} 기록했어요`);
  });

  it("AC-4[P0]: onSave가 {ok:false}면 시트는 열린 채 입력값이 그대로다", () => {
    const onSave = vi.fn(() => ({ ok: false }));
    const { onClose } = renderSheet(onSave as any);
    fireEvent.change(payday(), { target: { value: "25" } });
    fireEvent.change(total(), { target: { value: "3000000" } });
    fireEvent.click(saveBtn());
    expect(onSave).toHaveBeenCalledWith(25, 3000000);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(payday().value).toBe("25");
    expect(total().value).toBe("3,000,000");
  });

  it("AC-4[P0]: onRecord가 {ok:false}면 입력값 유지, 토스트 없음", () => {
    const props = renderSpend({ onRecord: vi.fn(() => ({ ok: false, reason: "quota" })) });
    fireEvent.change(spendField(), { target: { value: "7000" } });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    expect(props.onRecord).toHaveBeenCalledWith(7000);
    expect(spendField().value).toBe("7,000");
    expect(props.onToast).not.toHaveBeenCalled();
  });

  it("AC-4: 오늘 무지출은 entries>0이면, 마지막 기록 취소는 entries===0이면 비활성이다", () => {
    const { unmount } = render(
      React.createElement(MemoryRouter, null, React.createElement(SpendInput, {
        entriesCount: 0, onRecord: vi.fn(), onNoSpend: vi.fn(), onUndo: vi.fn(), onToast: vi.fn(),
      } as any)),
    );
    expect(screen.getByRole("button", { name: /오늘 무지출/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /마지막 기록 취소/ })).toBeDisabled();
    unmount();
    renderSpend({ entriesCount: 2 });
    expect(screen.getByRole("button", { name: /오늘 무지출/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /마지막 기록 취소/ })).not.toBeDisabled();
  });
});

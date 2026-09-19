import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    BottomSheet: Object.assign(
      ({ open, children }: any) => (open ? h("div", { role: "dialog" }, children) : null),
      { Header: ({ children }: any) => h("div", null, children) },
    ),
    TextField: R.forwardRef(({ label, help, hasError, variant, suffix, prefix, ...props }: any, ref: any) =>
      h(
        "div",
        null,
        h("label", null, label),
        h("input", { ref, ...props }),
        help ? h("span", { "data-help": hasError ? "error" : "info" }, help) : null,
      ),
    ),
    Chip: ({ children, onClick, active, selected }: any) =>
      h("button", { type: "button", "aria-pressed": !!(active ?? selected), onClick }, children),
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

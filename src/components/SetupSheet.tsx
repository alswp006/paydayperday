import { useEffect, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { BottomSheet, Chip, ChipItem, Spacing, TextField } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { normalizeDigits } from '@/lib/numberInput';
import { formatNumber } from '@/lib/utils';
import type { SaveResult } from '@/lib/types';

interface SetupSheetProps {
  open: boolean;
  initial?: { paydayDay: number; cycleBudget: number };
  onSave: (paydayDay: number, cycleBudget: number) => SaveResult;
  onClose: () => void;
}

const DAY_CHIPS: { label: string; value: number }[] = [
  { label: '10일', value: 10 },
  { label: '15일', value: 15 },
  { label: '21일', value: 21 },
  { label: '25일', value: 25 },
  { label: '말일', value: 31 },
];

const DAY_HELP = '1~31 사이로 입력해 주세요';
const BUDGET_HELP = '1,000원 ~ 100,000,000원 사이로 입력해 주세요';

function haptic(type: 'tickWeak' | 'success') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* 네이티브 브릿지 없는 환경 */
  }
}

function scrollToCenter(e: FocusEvent<HTMLElement>) {
  try {
    e.currentTarget.scrollIntoView?.({ block: 'center' });
  } catch {
    /* noop */
  }
}

export default function SetupSheet({ open, initial, onSave, onClose }: SetupSheetProps) {
  const [day, setDay] = useState('');
  const [budget, setBudget] = useState('');
  const [dayTouched, setDayTouched] = useState(false);
  const [budgetTouched, setBudgetTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDay(initial ? String(initial.paydayDay) : '');
    setBudget(initial ? String(initial.cycleBudget) : '');
    setDayTouched(false);
    setBudgetTouched(false);
    // 열릴 때만 초기값을 채운다 — 저장 실패 시 입력값 유지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dayNum = day ? Number(day) : 0;
  const budgetNum = budget ? Number(budget) : 0;
  const dayValid = dayNum >= 1 && dayNum <= 31;
  const budgetValid = budgetNum >= 1000 && budgetNum <= 100_000_000;

  const handleDay = (e: ChangeEvent<HTMLInputElement>) => {
    setDay(normalizeDigits(e.target.value, 2));
    setDayTouched(true);
  };
  const handleBudget = (e: ChangeEvent<HTMLInputElement>) => {
    setBudget(normalizeDigits(e.target.value, 9));
    setBudgetTouched(true);
  };
  const pickDay = (value: number) => {
    haptic('tickWeak');
    setDay(String(value));
    setDayTouched(true);
  };
  const handleSave = () => {
    if (!dayValid || !budgetValid) return;
    haptic('success');
    const result = onSave(dayNum, budgetNum);
    if (result.ok) onClose();
  };

  const showDayError = dayTouched && !dayValid;
  const showBudgetError = budgetTouched && !budgetValid;

  // 제목은 BottomSheet.Header(TDS 기본 좌우 24px 인셋) — children으로 넣으면 시트 가장자리에 붙는다.
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={<BottomSheet.Header>예산 설정</BottomSheet.Header>}
      // 저장은 cta 슬롯(BottomSheet.CTA) — children의 맨 Button은 시트 좌우 가장자리에 붙었다(제목·칸은 20~24px 인셋).
      cta={
        <BottomSheet.CTA disabled={!dayValid || !budgetValid} onClick={handleSave} aria-label="저장">
          저장
        </BottomSheet.CTA>
      }
    >
      <Spacing size={16} />
      {/* labelOption="sustain": 빈 칸에서도 라벨을 계속 보여 준다(기본 'appear'는 값이 있을 때만 — 두 칸이 placeholder만으로 구분됐다). */}
      <TextField
        variant="box"
        label="월급날"
        labelOption="sustain"
        placeholder="예: 25"
        inputMode="numeric"
        enterKeyHint="next"
        value={day}
        onChange={handleDay}
        onFocus={scrollToCenter}
        help={showDayError ? DAY_HELP : undefined}
        hasError={showDayError}
        aria-label="월급날"
      />
      <Spacing size={8} />
      {/* TDS Chip은 그룹 컨테이너(div), ChipItem이 개별 칩(button) — Chip을 칩마다 쓰면 알약이 아니라 맨 텍스트로 렌더된다. */}
      <Chip wrap>
        {DAY_CHIPS.map((c) => {
          const selected = dayNum === c.value;
          return (
            <ChipItem key={c.label} selected={selected} aria-pressed={selected} onClick={() => pickDay(c.value)}>
              {c.label}
            </ChipItem>
          );
        })}
      </Chip>
      <Spacing size={20} />
      <TextField
        variant="box"
        label="이번 달 쓸 수 있는 총액"
        labelOption="sustain"
        placeholder="예: 3,000,000"
        inputMode="numeric"
        enterKeyHint="done"
        value={budget ? formatNumber(budgetNum) : ''}
        onChange={handleBudget}
        onFocus={scrollToCenter}
        help={showBudgetError ? BUDGET_HELP : undefined}
        hasError={showBudgetError}
        aria-label="이번 달 쓸 수 있는 총액"
      />
      <Spacing size={16} />
    </BottomSheet>
  );
}

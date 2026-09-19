import { useEffect, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { BottomSheet, Button, Chip, Paragraph, Spacing, TextField } from '@toss/tds-mobile';
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

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Paragraph.Text typography="t4">예산 설정</Paragraph.Text>
      <Spacing size={16} />
      <TextField
        variant="box"
        label="월급날"
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
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {DAY_CHIPS.map((c) => (
          <Chip key={c.label} onClick={() => pickDay(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>
      <Spacing size={20} />
      <TextField
        variant="box"
        label="이번 달 쓸 수 있는 총액"
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
      <Spacing size={24} />
      <Button
        variant="fill"
        size="xlarge"
        display="block"
        disabled={!dayValid || !budgetValid}
        onClick={handleSave}
        aria-label="저장"
      >
        저장
      </Button>
      <Spacing size={16} />
    </BottomSheet>
  );
}

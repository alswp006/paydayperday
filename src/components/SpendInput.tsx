import { useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';
import { Button, Chip, ChipItem, Paragraph, Spacing, TextField } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { normalizeDigits } from '@/lib/numberInput';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { SaveResult } from '@/lib/types';

interface SpendInputProps {
  entriesCount: number;
  onRecord: (amount: number) => SaveResult;
  onNoSpend: () => SaveResult;
  onUndo: () => SaveResult;
  onToast: (msg: string) => void;
}

const QUICK_AMOUNTS = [5000, 10000, 30000];
const MAX_SPEND = 10_000_000;
const RANGE_HELP = '1원 ~ 10,000,000원 사이로 입력해 주세요';

function haptic(type: 'tickWeak' | 'success' | 'tickMedium') {
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

export default function SpendInput({ entriesCount, onRecord, onNoSpend, onUndo, onToast }: SpendInputProps) {
  const [amount, setAmount] = useState('');

  const amountNum = amount ? Number(amount) : 0;
  const invalid = amountNum < 1 || amountNum > MAX_SPEND;
  const showError = amount !== '' && invalid;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(normalizeDigits(e.target.value, 8));
  };
  const addQuick = (n: number) => {
    haptic('tickWeak');
    setAmount(normalizeDigits(String(amountNum + n), 8));
  };
  const handleRecord = () => {
    if (invalid) return;
    haptic('success');
    const result = onRecord(amountNum);
    if (result.ok) {
      setAmount('');
      onToast(`${formatCurrency(amountNum)} 기록했어요`);
    }
  };
  const handleNoSpend = () => {
    haptic('success');
    onNoSpend();
  };
  const handleUndo = () => {
    haptic('tickMedium');
    const result = onUndo();
    if (result.ok) onToast('마지막 기록을 취소했어요');
  };

  return (
    <>
      <Paragraph.Text typography="t4">오늘 지출 기록</Paragraph.Text>
      <Spacing size={12} />
      <TextField
        variant="box"
        label="오늘 쓴 금액"
        placeholder="예: 12,000"
        inputMode="numeric"
        enterKeyHint="done"
        value={amount ? formatNumber(amountNum) : ''}
        onChange={handleChange}
        onFocus={scrollToCenter}
        help={showError ? RANGE_HELP : undefined}
        hasError={showError}
        aria-label="오늘 지출 금액"
      />
      <Spacing size={8} />
      {/* TDS Chip은 그룹(div), ChipItem이 개별 칩(button). 더하기 칩은 선택 상태가 없는 kind="action". */}
      <Chip kind="action" wrap>
        {QUICK_AMOUNTS.map((n) => (
          <ChipItem key={n} onClick={() => addQuick(n)}>
            {`+${formatNumber(n)}`}
          </ChipItem>
        ))}
      </Chip>
      <Spacing size={8} />
      <Paragraph.Text typography="st13">칩을 누르면 금액이 더해져요. 아래 기록하기를 눌러야 저장돼요</Paragraph.Text>
      <Spacing size={12} />
      <Button variant="fill" size="large" display="block" disabled={invalid} onClick={handleRecord} aria-label="기록하기">
        기록하기
      </Button>
      <Spacing size={8} />
      {/* 무지출 버튼은 본문 텍스트가 접근성 이름 — aria-label을 주면 지출 입력칸 라벨 조회와 겹친다 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="weak" size="medium" disabled={entriesCount !== 0} onClick={handleNoSpend} aria-label={undefined}>
          오늘 무지출
        </Button>
        <Button
          variant="weak"
          size="medium"
          color="dark"
          disabled={entriesCount === 0}
          onClick={handleUndo}
          aria-label="마지막 기록 취소"
        >
          마지막 기록 취소
        </Button>
      </div>
    </>
  );
}

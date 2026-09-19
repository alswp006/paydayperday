import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Button, ListRow, Paragraph, Spacing, Top } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { WeekStreak } from '@/components/WeekStreak';
import { ResultAdGate } from '@/components/ResultAdGate';
import { load, isAdUnlockedToday, markAdUnlocked, resetAll } from '@/lib/budgetStore';
import { computeDaily } from '@/lib/calculator';
import { calcStreak, weekStatus } from '@/lib/streak';
import { toDateKey } from '@/lib/date';
import { formatCurrency } from '@/lib/utils';
import type { AppResult } from '@/lib/types';

function haptic(type: 'tickWeak' | 'success') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* 네이티브 브릿지 없는 환경 */
  }
}

function row(top: string, bottom: string) {
  return <ListRow contents={<ListRow.Texts type="2RowTypeA" top={top} bottom={bottom} />} />;
}

function ResultContent({ result, onHome }: { result: AppResult; onHome: () => void }) {
  useEffect(() => {
    haptic('success');
    markAdUnlocked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const over = result.todayLeft < 0;
  const tomorrow =
    result.tomorrowBudget === null ? '내일은 월급날이에요' : formatCurrency(result.tomorrowBudget);

  return (
    <>
      <SummaryHero
        label={over ? '오늘 넘긴 예산' : '오늘 아낀 예산'}
        value={<Amount value={Math.abs(result.todayLeft)} unit="원" typography="t1" />}
        caption={`${result.streak}일 연속 예산 지킴`}
      />
      <Spacing size={16} />
      {row('오늘 예산', formatCurrency(result.todayBudget))}
      {row('오늘 쓴 돈', formatCurrency(result.todaySpent))}
      {row(over ? '초과한 돈' : '남긴 돈', formatCurrency(Math.abs(result.todayLeft)))}
      {row('내일 예산', tomorrow)}
      {row('월급날', `D-${result.remainingDays}`)}
      <Spacing size={24} />
      <WeekStreak week={result.week} streak={result.streak} />
      <div style={{ height: 'calc(88px + env(safe-area-inset-bottom))' }} />
      <SubmitFooter label="홈으로" onClick={onHome} />
    </>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);

  const today = toDateKey(new Date());
  const snap = useMemo(() => load(), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const settings = snap.ok ? snap.settings : null;
  const expired = !!settings && today >= settings.cycleEnd;
  const redirect = snap.ok && (!settings || expired);

  useEffect(() => {
    if (redirect) navigate('/', { replace: true });
  }, [redirect, navigate]);

  const goHome = () => {
    haptic('tickWeak');
    navigate('/');
  };

  const top = <Top title={<Top.TitleParagraph>오늘 결산</Top.TitleParagraph>} />;

  let body;
  if (!snap.ok) {
    body = (
      <>
        <Spacing size={24} />
        <Paragraph.Text typography="t5">데이터를 불러오지 못했어요</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" aria-label="다시 시도" onClick={() => setTick((t) => t + 1)}>
          다시 시도
        </Button>
        <Spacing size={8} />
        <Button variant="weak" display="block" aria-label="초기화" onClick={() => setResetOpen(true)}>
          초기화
        </Button>
        <AlertDialog
          open={resetOpen}
          title="기록을 모두 지울까요?"
          description="설정과 지출 기록이 모두 삭제돼요"
          alertButton={
            <AlertDialog.AlertButton
              onClick={() => {
                resetAll();
                setResetOpen(false);
                setTick((t) => t + 1);
              }}
            >
              초기화
            </AlertDialog.AlertButton>
          }
          onClose={() => setResetOpen(false)}
        />
      </>
    );
  } else if (redirect || !settings) {
    body = null;
  } else if (!snap.records[today]) {
    body = (
      <>
        <Spacing size={24} />
        <Paragraph.Text typography="t5">
          오늘 기록이 아직 없어요. 지출이나 무지출을 기록하면 결산을 볼 수 있어요
        </Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" aria-label="홈으로" onClick={goHome}>
          홈으로
        </Button>
      </>
    );
  } else {
    const daily = computeDaily(settings, snap.records, today);
    const result: AppResult = {
      ...daily,
      week: weekStatus(snap.records, today),
      streak: calcStreak(snap.records, today),
    };
    body = (
      <>
        <Spacing size={16} />
        <ResultAdGate unlocked={isAdUnlockedToday()} onHome={goHome}>
          <ResultContent result={result} onHome={goHome} />
        </ResultAdGate>
      </>
    );
  }

  return <ScreenScaffold top={top}>{body}</ScreenScaffold>;
}

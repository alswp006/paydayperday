import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, Button, Paragraph, Skeleton, Spacing, Toast, Top } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { EmptyState } from '@/components/StateView';
import SetupSheet from '@/components/SetupSheet';
import SpendInput from '@/components/SpendInput';
import TodayDashboard from '@/components/TodayDashboard';
import { addSpend, load, markNoSpend, resetAll, saveSettings, undoLastSpend } from '@/lib/budgetStore';
import { computeDaily } from '@/lib/calculator';
import { calcStreak, weekStatus } from '@/lib/streak';
import { toDateKey } from '@/lib/date';
import type { RouteState, SaveResult } from '@/lib/types';

type Haptic = 'tickWeak' | 'tickMedium';

function haptic(type: Haptic) {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* 네이티브 브릿지 없는 환경 */
  }
}

const QUOTA_MSG = '저장 공간이 부족해요. 기록을 초기화하면 다시 저장할 수 있어요';
const UNKNOWN_MSG = '저장에 실패했어요. 다시 시도해 주세요';

export default function Home() {
  const navigate = useNavigate();
  const [snap, setSnap] = useState(() => load());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '' });

  const showToast = (message: string) => setToast({ open: true, message });
  const refresh = () => setSnap(load());
  const failToast = (r: SaveResult) => showToast(r.reason === 'quota' ? QUOTA_MSG : UNKNOWN_MSG);

  const openReset = () => setResetOpen(true);

  const openSheet = () => {
    haptic('tickWeak');
    setSheetOpen(true);
  };

  const wrap = (fn: () => SaveResult) => () => {
    const r = fn();
    if (r.ok) refresh();
    else failToast(r);
    return r;
  };
  const wrapAmount = (amount: number) => wrap(() => addSpend(amount))();

  const today = toDateKey(new Date());
  const settings = snap.ok ? snap.settings : null;
  const records = snap.ok ? snap.records : {};
  const expired = !!settings && today >= settings.cycleEnd;
  const active = !!settings && !expired;

  const handleSave = (paydayDay: number, cycleBudget: number): SaveResult => {
    const r = saveSettings(paydayDay, cycleBudget, { newCycle: !settings || expired });
    if (r.ok) {
      setSheetOpen(false);
      refresh();
      showToast('예산을 설정했어요');
    } else {
      failToast(r);
    }
    return r;
  };

  const handleReset = () => {
    haptic('tickMedium');
    resetAll();
    setResetOpen(false);
    refresh();
  };

  const goResult = () => {
    if (!settings || !records[today]) return;
    haptic('tickWeak');
    const result = computeDaily(settings, records, today);
    const state: RouteState = {
      result: { ...result, week: weekStatus(records, today), streak: calcStreak(records, today) },
      input: { settings, todaySpent: result.todaySpent },
    };
    navigate('/result', { state });
  };

  let body;
  if (!snap.ok) {
    body = (
      <>
        <Spacing size={24} />
        <Paragraph.Text typography="t5">데이터를 불러오지 못했어요</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" onClick={refresh} aria-label="다시 시도">
          다시 시도
        </Button>
        <Spacing size={8} />
        <Button variant="weak" display="block" onClick={openReset} aria-label="초기화">
          초기화
        </Button>
      </>
    );
  } else if (!settings) {
    body = (
      <EmptyState
        title="월급날까지 하루 예산을 계산해 드릴게요"
        action={
          <Button variant="weak" onClick={openSheet} aria-label="시작하기">
            시작하기
          </Button>
        }
      />
    );
  } else if (expired) {
    body = (
      <>
        <Spacing size={24} />
        <Paragraph.Text typography="t5">월급날이 지났어요. 이번 달 예산을 새로 설정해 주세요</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" onClick={openSheet} aria-label="새로 설정하기">
          새로 설정하기
        </Button>
      </>
    );
  } else {
    const result = computeDaily(settings, records, today);
    body = (
      <>
        <TodayDashboard result={result} cycleEnd={settings.cycleEnd} />
        <Spacing size={24} />
        <SpendInput
          entriesCount={records[today]?.entries.length ?? 0}
          onRecord={wrapAmount}
          onNoSpend={wrap(markNoSpend)}
          onUndo={wrap(undoLastSpend)}
          onToast={showToast}
        />
        <div style={{ height: 'calc(88px + env(safe-area-inset-bottom))' }} />
      </>
    );
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>PaydayPerDay</Top.TitleParagraph>}
          right={
            active ? (
              <Button variant="weak" size="small" onClick={openSheet} aria-label="예산 수정">
                예산 수정
              </Button>
            ) : undefined
          }
        />
      }
      bottom={
        active ? (
          <SubmitFooter label="오늘 결산 보기" onClick={goResult} disabled={!records[today]} />
        ) : undefined
      }
    >
      {body}
      <SetupSheet
        open={sheetOpen}
        initial={settings ? { paydayDay: settings.paydayDay, cycleBudget: settings.cycleBudget } : undefined}
        onSave={handleSave}
        onClose={() => setSheetOpen(false)}
      />
      <AlertDialog
        open={resetOpen}
        title="기록을 모두 지울까요?"
        description="설정과 지출 기록이 모두 삭제돼요"
        alertButton={<AlertDialog.AlertButton onClick={handleReset}>초기화</AlertDialog.AlertButton>}
        onClose={() => setResetOpen(false)}
      />
      <Toast
        position="bottom"
        open={toast.open}
        text={toast.message}
        onClose={() => setToast({ open: false, message: toast.message })}
      />
    </ScreenScaffold>
  );
}

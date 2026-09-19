import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Paragraph, Spacing } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { TossRewardAd } from '@/components/TossRewardAd';

interface ResultAdGateProps {
  unlocked: boolean;
  onHome: () => void;
  children?: ReactNode;
}

type GateState = 'ad' | 'offline' | 'loadFailed' | 'dismissed';

const PANELS: Record<Exclude<GateState, 'ad'>, { text: string; retry: string }> = {
  offline: { text: '인터넷 연결을 확인한 뒤 다시 시도해 주세요', retry: '다시 시도' },
  loadFailed: { text: '광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요', retry: '다시 시도' },
  dismissed: { text: '광고를 끝까지 보면 오늘 결산을 볼 수 있어요', retry: '다시 보기' },
};

function isOffline(): boolean {
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  } catch {
    return false;
  }
}

function tick() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* 네이티브 브릿지 없는 환경 */
  }
}

// TossRewardAd에는 로드 실패·닫힘 콜백 prop이 없다(onRewarded만 있음). 있는 경우에 대비해 넘겨 둔다.
const AD_SLOT_ID = (import.meta.env.VITE_TOSS_AD_SLOT_ID as string | undefined) ?? '';

export function ResultAdGate({ unlocked, onHome, children }: ResultAdGateProps) {
  const [state, setState] = useState<GateState>(() => (isOffline() ? 'offline' : 'ad'));
  const [adKey, setAdKey] = useState(0);

  if (unlocked) return <>{children}</>;

  const current: GateState = state === 'ad' && isOffline() ? 'offline' : state;

  if (current === 'ad') {
    const adProps = {
      onLoadFailed: () => setState('loadFailed'),
      onDismissed: () => setState('dismissed'),
    };
    return (
      <TossRewardAd key={adKey} slotId={AD_SLOT_ID} {...adProps}>
        {children}
      </TossRewardAd>
    );
  }

  const handleRetry = () => {
    tick();
    if (isOffline()) {
      setState('offline');
      return;
    }
    setAdKey((k) => k + 1);
    setState('ad');
  };

  const panel = PANELS[current];
  return (
    <div role="alert" data-testid="ad-gate-panel">
      <Paragraph.Text typography="t5">{panel.text}</Paragraph.Text>
      <Spacing size={16} />
      <Button display="block" variant="fill" aria-label={panel.retry} onClick={handleRetry}>
        {panel.retry}
      </Button>
      <Spacing size={8} />
      <Button display="block" variant="weak" aria-label="홈으로" onClick={onHome}>
        홈으로
      </Button>
    </div>
  );
}

export default ResultAdGate;

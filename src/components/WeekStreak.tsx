import { Paragraph, Spacing } from '@toss/tds-mobile';
import { formatNumber } from '@/lib/utils';
import type { AppResult, WeekDay } from '@/lib/types';

interface WeekStreakProps {
  week: AppResult['week'];
  streak: number;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const STATUS: Record<WeekDay['status'], { label: string; mark: string }> = {
  success: { label: '지킴', mark: '✓' },
  fail: { label: '초과', mark: '✕' },
  none: { label: '기록 없음', mark: '·' },
  future: { label: '예정', mark: '' },
};

function dayName(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return DAY_NAMES[new Date(y, (m || 1) - 1, d || 1).getDay()] ?? '';
}

export function WeekStreak({ week, streak }: WeekStreakProps) {
  const days = Array.isArray(week) ? week : [];
  const kept = days.filter((d) => d.status === 'success').length;

  return (
    <div data-testid="week-streak">
      <Paragraph.Text typography="t4">이번 주 예산 준수</Paragraph.Text>
      <Spacing size={4} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600, gray)">
        {formatNumber(streak)}일 연속 예산 지킴
      </Paragraph.Text>
      <Spacing size={12} />
      <div style={{ display: 'flex', gap: 4 }}>
        {days.map((d) => {
          const name = dayName(d.date);
          const s = STATUS[d.status] ?? STATUS.none;
          return (
            <div
              key={d.date}
              role="img"
              aria-label={`${name} ${s.label}`}
              style={{
                flex: 1,
                minHeight: 44,
                minWidth: 44,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: 'var(--adaptiveGrey100, whitesmoke)',
              }}
            >
              <Paragraph.Text typography="st13" color="var(--adaptiveGrey500, darkgray)">
                {name}
              </Paragraph.Text>
              <Paragraph.Text typography="st6">{s.mark}</Paragraph.Text>
            </div>
          );
        })}
      </div>
      <Spacing size={8} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600, gray)">
        이번 주 {formatNumber(kept)}/7일 준수
      </Paragraph.Text>
    </div>
  );
}

export default WeekStreak;

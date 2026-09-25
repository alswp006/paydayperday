import { ListRow, Paragraph, Spacing } from '@toss/tds-mobile';
import { Amount } from '@/components/Amount';
import { SummaryHero } from '@/components/SummaryHero';
import { formatDate } from '@/lib/date';
import { formatNumber } from '@/lib/utils';
import type { AppResult, DateKey } from '@/lib/types';

interface TodayDashboardProps {
  result: Omit<AppResult, 'week' | 'streak'>;
  cycleEnd: DateKey;
}

const won = (n: number) => `${formatNumber(n)}원`;

export default function TodayDashboard({ result, cycleEnd }: TodayDashboardProps) {
  const { remainingDays, todayBudget, todaySpent, todayLeft, cycleOverspent, yesterdayCarry } = result;

  return (
    <>
      <Spacing size={8} />
      <Paragraph.Text typography="t6" color="var(--adaptiveGrey600, gray)">
        {remainingDays === 1 ? (
          '내일 월급날이에요'
        ) : (
          <>
            월급날까지 <span>{`D-${formatNumber(remainingDays)}`}</span> ({formatDate(cycleEnd)})
          </>
        )}
      </Paragraph.Text>
      <Spacing size={12} />
      <SummaryHero
        label="오늘 쓸 수 있는 돈"
        value={<Amount value={todayBudget} unit="원" typography="t1" />}
        caption={cycleOverspent > 0 ? `이번 달 예산을 ${won(cycleOverspent)} 넘겼어요` : undefined}
        testId="today-hero"
      />
      <Spacing size={16} />
      <ListRow contents={<ListRow.Texts type="2RowTypeA" top="오늘 쓴 돈" bottom={won(todaySpent)} />} />
      <ListRow
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top="오늘 남은 돈"
            bottom={
              todayLeft >= 0 ? (
                `${won(todayLeft)} 남았어요`
              ) : (
                <span style={{ color: 'var(--adaptiveRed500, crimson)' }}>{won(-todayLeft)} 초과했어요</span>
              )
            }
          />
        }
      />
      {yesterdayCarry !== null && (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="t7" color="var(--adaptiveGrey500, darkgray)">
            {yesterdayCarry >= 0
              ? `어제 ${won(yesterdayCarry)} 남겨서 남은 날 예산에 더했어요`
              : `어제 ${won(-yesterdayCarry)} 초과해서 남은 날 예산에서 뺐어요`}
          </Paragraph.Text>
        </>
      )}
    </>
  );
}

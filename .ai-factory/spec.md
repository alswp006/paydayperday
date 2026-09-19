# PaydayPerDay (payday-per-day)

> **이번 보완 요약**: 기존 내용은 그대로 두고, 새로 넣은 AC와 Task 항목에만 **[보완]** 표시를 달았습니다. 추가한 AC는 7개입니다: F4-AC-6, F4-AC-7, AC-INPUT-3, AC-STORAGE-1, AC-AD-FAIL, AC-REWARD-2, AC-NETWORK. 새 Task는 2개입니다: T14, T15.

## Mini-PRD

- **한줄 요약**: 다음 월급날까지 D-11, 오늘 쓸 수 있는 돈은 38,000원. 매일 열어 보는 하루 생활비 계기판
- **문제**: 월급이 들어오면 돈을 많이 쓰고 월말에 돈이 모자란다. 남은 돈을 남은 날짜로 나눠 하루 예산을 매일 계산해 주는 도구가 없다.
- **목표**: 월급날과 이번 달 쓸 수 있는 총액만 입력하면 3초 안에 "오늘 쓸 수 있는 돈"과 "월급날 D-day"를 보여 준다. 사용자가 하루 지출을 금액 한 번으로 기록하고, 연속으로 예산을 지킨 일수를 확인할 수 있게 한다.
- **타겟 유저**: 20~30대 직장인 중 월급 입금 직후 과소비해서 월말에 돈이 부족해지는 사람
- **핵심 기능** (4개):
  1. **예산 설정**: 월급날(매월 N일)과 이번 달 쓸 수 있는 총액을 입력하면 D-day와 오늘 하루 예산(남은 예산 ÷ 남은 일수)을 계산해 보여 준다.
  2. **빠른 지출 입력과 이월**: 오늘 쓴 금액을 한 번 입력한다. 남긴 돈이나 초과한 돈은 남은 날짜에 나눠 반영되어 내일 예산이 바뀐다.
  3. **오늘 결산 리포트**: 오늘 남긴 돈이나 초과한 돈, 내일 예산, 이번 주 예산 준수 현황을 보여 준다. 리워드 광고를 봐야 열린다.
  4. **주간 예산 준수 스트릭**: 이번 주 월~일 7칸 준수 현황과 연속 준수 일수를 보여 준다. 기능 3의 결산 리포트 화면 안에 표시한다.
- **비목표**:
  - 은행·카드 연동이나 지출 자동 수집을 하지 않는다. 지출은 직접 입력만 받는다.
  - 카테고리별 가계부, 차트, 월별 통계를 제공하지 않는다.
  - 주말·공휴일에 따른 월급일 조정, 푸시 알림, 여러 기기 간 동기화를 하지 않는다.
- **수익 모델**: 리워드 광고로 결과 화면 잠금
  - 핵심 가치인 오늘 예산과 D-day는 홈에서 무료로 보여 준다. 결산 리포트(/result)만 하루 1회 광고 시청 후 열린다. 하루에 광고를 여러 번 보게 하지 않기 위해서다.
  - 예상 수익(가정: DAU 1,000명): 1,000 × 0.2 × 30 × $4/1000 × 1,350 × 0.85 = **약 27,540원/월**
  - 인앱광고 수수료는 2026-07 현재 수취 유예 상태여서 실제 수수료는 0%다. 그래서 현재 실제 예상 순수익은 **약 32,400원/월**이다. 유예가 끝나면 수수료 15%가 적용되어 27,540원이 된다.

---

## SPEC

### 공통 정의
- **today**: 기기 로컬 시간대 기준 오늘 날짜. 날짜 키 형식은 `YYYY-MM-DD`이다.
- **cycleStart**: 예산을 설정한 날. **cycleEnd**: 다음 월급날. 이번 사이클은 cycleStart부터 cycleEnd 전날까지다.
- **remainingDays** = `diffDays(cycleEnd, today)`. 오늘을 포함해 월급날 전날까지의 일수다.
- **floor100(x)** = `Math.floor(x / 100) * 100`. 100원 미만은 버린다. 버린 금액은 남은 예산에 남아 다음 날 계산에 다시 포함된다.

### F1: 월급날과 이번 달 총액 설정
- **F1-AC-1: [E]** 처음 들어왔을 때 `ppd:settings`가 없으면 대시보드 대신 Empty State를 보여 준다. 문구는 "월급날까지 하루 예산을 계산해 드릴게요", 버튼은 "시작하기"다. "시작하기"를 누르면 설정 BottomSheet가 열린다.
- **F1-AC-2: [U]** 설정 BottomSheet에는 입력 칸 2개와 Chip이 있다.
  - "월급날" TextField: 1~31 사이 정수만 받는다.
  - "이번 달 쓸 수 있는 총액" TextField: 1,000~100,000,000원 정수만 받는다.
  - 월급날 빠른 선택 Chip `10일 / 15일 / 21일 / 25일 / 말일`: 누르면 월급날 필드에 값이 채워진다. "말일"은 31로 채운다.
  - "저장" 버튼은 두 필드가 모두 유효할 때만 활성화된다.
- **F1-AC-3: [E]** "저장"을 누르면 `{ paydayDay, cycleBudget, cycleStart: today, cycleEnd: nextPayday(today, paydayDay) }`를 `ppd:settings`에 저장한다. 그다음 BottomSheet를 닫고 Toast "예산을 설정했어요"를 보여 준다. 대시보드는 새로고침 없이 바로 새 값으로 바뀐다.
- **F1-AC-4: [U]** `nextPayday(today, d)` 규칙:
  - today의 일(day)이 d보다 작으면 이번 달 d일이다.
  - 그렇지 않으면(월급날 당일 포함) 다음 달 d일이다.
  - 해당 월에 d일이 없으면 그 달 말일로 맞춘다.
  - 이 네 가지 테스트 케이스가 통과해야 한다:
    - today 2026-09-20, d=25 → 2026-09-25 (D-5)
    - today 2026-09-20, d=10 → 2026-10-10 (D-20)
    - today 2026-09-25, d=25 → 2026-10-25 (D-30)
    - today 2026-09-20, d=31 → 2026-09-30 (D-10)
- **F1-AC-5: [E]** today가 cycleEnd와 같거나 그 이후면 대시보드 숫자와 지출 입력을 숨긴다. 대신 "월급날이 지났어요. 이번 달 예산을 새로 설정해 주세요" 안내와 "새로 설정하기" 버튼을 보여 준다. 설정 시트에는 이전 paydayDay와 cycleBudget을 미리 채워 둔다. 저장하면 F1-AC-3과 똑같이 새 사이클을 시작한다(cycleStart = today).
- **F1-AC-6: [E]** 사이클이 진행 중일 때 Top 영역의 "예산 수정"을 누르면 현재 값이 채워진 설정 시트가 열린다. 저장하면:
  - cycleStart는 그대로 둔다.
  - cycleEnd는 `nextPayday(today, 새 paydayDay)`로 다시 계산한다.
  - 오늘 기록의 budget 스냅샷도 새 todayBudget으로 갱신한다.

### F2: 오늘 하루 예산과 D-day 카운트다운
- **F2-AC-1: [U]** 홈 상단에 D-day를 `D-{remainingDays}` 형식으로 보여 준다. 예: "월급날까지 D-5 (9월 25일)"
- **F2-AC-2: [U]** 오늘 예산은 `todayBudget = floor100((cycleBudget − spentBefore) / remainingDays)`로 계산한다.
  - spentBefore는 cycleStart ≤ 날짜 < today인 기록의 지출 합계다. 기록이 없는 날은 0원으로 본다.
  - 예: 총액 500,000원, 이전 지출 0원, remainingDays 5 → **100,000원**
- **F2-AC-3: [U]** "오늘 남은 돈"은 `todayBudget − todaySpent`이다.
  - 0 이상이면 "{금액} 남았어요"로 보여 준다.
  - 0 미만이면 "{절댓값} 초과했어요"를 TDS 빨강 계열 색상 토큰으로 보여 준다.
- **F2-AC-4: [W]** `cycleBudget − spentBefore ≤ 0`이면 todayBudget을 0원으로 보여 주고, 경고 문구 "이번 달 예산을 {초과액} 넘겼어요"를 함께 보여 준다. 음수 예산은 절대 표시하지 않는다.
- **F2-AC-5: [U]** remainingDays가 1이면 D-day 대신 "내일 월급날이에요"를 보여 준다.

### F3: 오늘 지출 빠른 입력과 이월
- **F3-AC-1: [E]** 지출 기록 흐름:
  - 사용자가 금액 TextField에 1~10,000,000원을 입력하고 "기록하기"를 누르면 금액을 오늘 기록의 `entries` 배열에 추가한다.
  - 추가 후 입력 칸을 비우고 Toast "{금액} 기록했어요"를 보여 준다. 오늘 남은 돈은 바로 다시 계산된다.
  - 빠른 금액 Chip `+5,000 / +10,000 / +30,000`을 누르면 입력값에 해당 금액을 더한다.
- **F3-AC-2: [E]** "오늘 무지출" 버튼을 누르면 오늘 기록을 `entries: []`, 지출 0원으로 만든다. 스트릭 판정에서는 기록된 날로 인정한다. 오늘 기록에 entries가 1개 이상 있으면 이 버튼은 비활성화된다.
- **F3-AC-3: [E]** "마지막 기록 취소"를 누르면 오늘 entries의 마지막 항목을 지우고 Toast "마지막 기록을 취소했어요"를 보여 준다. 오늘 entries가 0개면 이 버튼은 비활성화된다. 지난 날짜의 기록은 수정할 수 없다.
- **F3-AC-4: [U]** 오늘 기록을 쓸 때마다 `records[today].budget`에 그 시점의 todayBudget을 스냅샷으로 저장한다. 스트릭 판정에 쓰기 위해서다.
- **F3-AC-5: [U]** 이월 규칙: 오늘 남긴 돈이나 초과한 돈은 남은 날짜 전체에 나눠 반영된다.
  - 내일 예산은 `tomorrowBudget = floor100((cycleBudget − spentBefore − todaySpent) / (remainingDays − 1))`이다. 결과가 음수면 0원으로 보여 준다.
  - 예: 총액 500,000원, remainingDays 5, 오늘 120,000원 지출 → 내일 예산 **95,000원**
  - remainingDays가 1이면 내일 예산 대신 "내일은 월급날이에요"를 보여 준다.
- **F3-AC-6: [U]** 어제 기록이 있고 어제 날짜가 cycleStart 이상이면 홈에 어제의 이월 결과를 보여 준다. `carry = 어제 budget − 어제 지출`이다.
  - carry ≥ 0: "어제 {carry} 남겨서 남은 날 예산에 더했어요"
  - carry < 0: "어제 {|carry|} 초과해서 남은 날 예산에서 뺐어요"
  - 조건에 맞지 않으면 이 줄을 숨긴다.
- **F3-AC-7: [E]** 오늘 기록이 있으면(무지출 포함) "오늘 결산 보기" 버튼이 활성화된다. 누르면 `/result`로 이동하면서 `RouteState`를 전달한다.

### F4: 오늘 결산 리포트와 주간 예산 준수 스트릭 (/result)
- **F4-AC-1: [U]** 이번 주(월~일) 7칸에 날짜별 상태를 보여 준다.
  - `success`: 기록이 있고 지출 ≤ budget
  - `fail`: 기록이 있고 지출 > budget
  - `none`: 오늘 이전인데 기록이 없음
  - `future`: 오늘 이후
  - 오늘은 기록이 없으면 `none`으로 표시하되 스트릭을 끊지 않는다.
  - 각 칸에는 요일과 상태 기호(✓ / ✕ / · / 빈칸)를 표시하고, `aria-label="{요일} {상태}"`를 붙인다.
- **F4-AC-2: [U]** 연속 준수 일수(streak) 계산:
  - 오늘 기록이 success면 오늘부터 거꾸로 센다.
  - 오늘 기록이 없으면 어제부터 거꾸로 센다.
  - 오늘 기록이 fail이면 0이다.
  - 거꾸로 세다가 fail이나 none을 만나면 멈춘다.
  - 사이클이 바뀌어도 이어서 센다.
  - 화면에는 "{n}일 연속 예산 지킴"과 "이번 주 {success 수}/7일 준수"를 보여 준다.
- **F4-AC-3: [U]** 결산 화면에는 ListRow로 다음 항목을 보여 준다: 오늘 예산, 오늘 쓴 돈, 남긴 돈 또는 초과한 돈, 내일 예산(F3-AC-5), 월급날 D-day. 그 아래에 주간 스트릭(F4-AC-1, F4-AC-2)을 보여 준다.
- **F4-AC-4: [E]** `ppd:adUnlockedDate`가 today가 아니면 결산 내용을 `<TossRewardAd>`로 감싸 광고 시청 후에만 보여 준다. 결산 내용이 처음 렌더되면 `ppd:adUnlockedDate = today`를 저장한다. 같은 날 다시 들어오면 광고 없이 바로 보여 준다.
- **F4-AC-5: [W]** `/result`에 직접 들어온 경우:
  - `ppd:settings`가 없으면 `/`로 replace 이동한다.
  - route state가 없으면(새로고침 등) localStorage에서 결산 값을 다시 계산해 보여 준다.
- **[보완] F4-AC-6: [W]** `/result`에서 settings는 있지만 `records[today]`가 없을 때(URL 직접 입력, 새로고침 전 기록 취소 등):
  - 결산 ListRow, 주간 스트릭, TossRewardAd를 **렌더하지 않는다**. 광고를 요청하지 않고 `ppd:adUnlockedDate`도 바꾸지 않는다.
  - 대신 "오늘 기록이 아직 없어요. 지출이나 무지출을 기록하면 결산을 볼 수 있어요" 문구와 "홈으로" 버튼(`navigate('/', { replace: true })`)만 보여 준다.
  - route state가 있더라도 이 판정은 localStorage의 `records[today]` 기준으로 한다. 결산에 쓸 수 없는 오래된 state는 무시한다.
  - 판정 기준: 0원 결산 화면은 절대 보이지 않는다.
- **[보완] F4-AC-7: [W]** `/result`에 들어왔을 때 today ≥ cycleEnd(사이클 만료)이면 광고와 결산을 렌더하지 않는다. 대신 `/`로 replace 이동하고, 홈은 F1-AC-5 만료 안내를 보여 준다.

### 필수 AC (모든 QuickApp 공통)
- **AC-INPUT-1: [W]** 필수 입력(월급날, 총액, 지출 금액)이 비어 있으면 해당 제출 버튼을 비활성화하고, 필드를 터치한 뒤라면 TextField에 `hasError`를 표시한다.
- **AC-INPUT-2: [W]** 입력값이 범위를 벗어나면 help 텍스트로 안내한다.
  - 월급날이 1 미만이거나 31 초과: "1~31 사이로 입력해 주세요"
  - 총액이 1,000원 미만이거나 1억 원 초과: "1,000원 ~ 100,000,000원 사이로 입력해 주세요"
  - 지출이 0 이하이거나 1천만 원 초과: "1원 ~ 10,000,000원 사이로 입력해 주세요"
- **[보완] AC-INPUT-3: [U]** 숫자 입력 정규화. 대상은 월급날, 총액, 지출 TextField다.
  - 모든 숫자 TextField에 `inputMode="numeric"`을 쓴다.
  - 입력이나 붙여넣기가 일어나면 숫자(0-9)가 아닌 문자(`-`, `.`, `,`, `$`, `원`, 공백, 한글 등)를 즉시 제거한다. 그래서 음수, 소수점, 기호는 상태값에 들어가지 않는다.
  - 앞자리 0은 제거한다("007" → "7"). 결과가 빈 문자열이면 AC-INPUT-1에 따라 빈 값으로 처리한다.
  - 최대 자릿수를 넘는 입력은 받지 않는다: 월급날 2자리, 총액 9자리, 지출 8자리.
  - 금액 필드는 천 단위 콤마로 표시한다(`formatNumber`). 저장하는 값은 콤마 없는 정수(number)다.
  - 정규화 후 범위 검사는 AC-INPUT-2를 그대로 따른다.
  - 테스트 케이스 (입력 → 상태값):
    - `"$5,000"` → 5000
    - `"-25"` → 25
    - `"25.5"` → 255 (월급날 필드에서는 2자리 제한으로 "25"에서 더 받지 않음)
    - `"50000.99"` → 5000099
    - `"abc"` → 빈 값
    - `"0"` → 빈 값
- **AC-EMPTY: [S]** 처음 들어왔을 때 데이터가 없으면 TDS Pattern E의 Empty State를 보여 준다(F1-AC-1).
- **AC-LOADING: [S]** 첫 localStorage 읽기와 계산이 끝나기 전에는 Home과 Result의 숫자 영역 자리에 Skeleton이나 Spinner를 보여 준다.
- **AC-ERROR: [W]** 오류 처리:
  - localStorage JSON 파싱에 실패하면 "데이터를 불러오지 못했어요" 문구와 "다시 시도" 버튼(다시 읽기), "초기화" 버튼(AlertDialog로 확인 후 `ppd:*` 키 삭제)을 보여 준다.
  - 저장에 실패하면 Toast "저장에 실패했어요. 다시 시도해 주세요"를 보여 준다.
- **[보완] AC-STORAGE-1: [W]** localStorage 쓰기 실패(`QuotaExceededError`, 또는 접근 불가로 `setItem`이 throw하는 경우) 처리:
  1. `QuotaExceededError`가 나면 `ppd:records`에서 today 기준 30일보다 오래된 기록을 지우고 **1회만** 다시 저장한다.
  2. 다시 저장해도 실패하면 Toast "저장 공간이 부족해요. 기록을 초기화하면 다시 저장할 수 있어요"를 보여 준다. 그 밖의 쓰기 예외는 기존 AC-ERROR Toast를 쓴다.
  3. 저장에 실패하면 화면 상태를 **바꾸지 않는다**. entries에 항목이 추가되지 않고, 입력 칸이 유지되며, 설정 시트가 닫히지 않고, 성공 Toast도 뜨지 않는다.
  - 판정 기준: `setItem`이 항상 throw하도록 mock했을 때 "기록하기"를 누른 뒤에도 오늘 쓴 돈 값이 그대로다.
- **AC-A11Y-1: [U]** 모든 Button과 TextField에 `aria-label` 속성을 단다.
- **AC-A11Y-2: [U]** 모든 터치 타겟은 최소 44×44px이다. TDS 기본 크기를 유지하고, 주간 스트릭 칸도 44px 이상으로 만든다.
- **AC-A11Y-3: [U]** 색상은 `vars.color` 토큰만 쓴다. HEX 하드코딩은 0건이어야 한다(다크 모드 대응).
- **AC-REWARD: [E]** 결과 화면(/result)에서 TossRewardAd로 게이팅한다. 광고를 다 봐야 결산이 보인다(하루 1회, F4-AC-4).
- **[보완] AC-REWARD-2: [U]** 광고 완료 신호 연결 규칙:
  - 시청 완료 판정은 **템플릿 `TossRewardAd`가 children을 렌더하는 시점**으로 한다. 결산 children(`<ResultContent>`)의 첫 마운트(`useEffect`)에서만 `markAdUnlocked()`를 호출한다.
  - 광고 시청 완료 전에는 `<ResultContent>`가 DOM에 마운트되지 않아야 한다. 판정 기준: 광고 미완료 상태에서 결산 ListRow 텍스트("오늘 예산")를 쿼리하면 0건이다.
  - 광고를 중간에 닫거나 로드에 실패하면 `ppd:adUnlockedDate`를 쓰지 않는다.
  - 템플릿 `TossRewardAd`의 내부 로직은 바꾸지 않는다. 실패나 닫힘을 알려 주는 prop이 없을 때만 기존 동작을 유지한 채 선택형 콜백 prop(예: `onError`, `onDismiss`)을 전달하는 코드만 추가할 수 있다. 실제 prop 이름은 템플릿 코드를 확인해 따른다.
- **[보완] AC-AD-FAIL: [E]** 광고 로드 실패와 시청 미완료 처리(F4-AC-4 보완):
  - **로드 실패**(SDK 오류, 광고 없음): 결산을 숨긴 채 "광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요" 문구와 "다시 시도"(광고 재요청), "홈으로" 버튼을 보여 준다.
  - **시청 중 닫기**: "광고를 끝까지 보면 오늘 결산을 볼 수 있어요" 문구와 "다시 보기", "홈으로" 버튼을 보여 준다.
  - 두 경우 모두 결산 값은 노출되지 않고, `ppd:adUnlockedDate`는 바뀌지 않는다.
  - 자동 재시도나 강제 해제(광고 없이 보기)는 하지 않는다. 재시도는 사용자가 버튼을 누를 때만 한다.
  - 광고 대기 중에는 무한 로딩 상태가 없어야 한다. 실패 신호를 받으면 1초 안에 위 안내로 바뀐다.
- **[보완] AC-NETWORK: [W]** 네트워크 불안정 처리:
  - Home의 모든 기능(설정, 계산, 기록)은 네트워크 없이 동작한다(localStorage만 사용). 판정 기준: 오프라인 모드에서 F1~F3 AC가 모두 통과한다.
  - `/result`에서 광고가 필요할 때(오늘 unlock 없음) `navigator.onLine === false`이면 광고를 요청하지 않는다. 대신 "인터넷 연결을 확인한 뒤 다시 시도해 주세요" 문구와 "다시 시도", "홈으로" 버튼을 보여 준다.
  - "다시 시도"를 눌렀을 때 온라인이면 광고를 요청하고, 여전히 오프라인이면 같은 안내를 유지한다.
  - 오늘 이미 unlock했다면 오프라인에서도 결산을 바로 보여 준다.
- **AC-FORMAT: [U]** 금액은 모두 `formatCurrency`, 일수와 개수는 `formatNumber`로 출력한다. 예: 1,234,567원
- **AC-REVIEW-1: [W]** 외부 도메인으로 나가는 링크(`<a href="http…">`, `window.open`, `location.href = 외부`)는 0건이어야 한다.
- **AC-REVIEW-2: [U]** 실행 중 console.error는 0건이어야 한다.
- **AC-REVIEW-3: [W]** GA, Amplitude 등 외부 로깅 SDK의 import나 스크립트는 0건이어야 한다.
- **AC-KEYBOARD: [E]** TextField에 포커스되면 `scrollIntoView({ block: 'center' })`로 스크롤한다. 제출 버튼은 가상 키보드에 가려지지 않아야 한다.

### Screen Definitions

#### Home (/)
- **Top**: 타이틀 "PaydayPerDay", 오른쪽 "예산 수정" 버튼(사이클 진행 중일 때만)
- **상태**:
  1. 로딩: Skeleton
  2. 빈 상태: F1-AC-1
  3. 사이클 만료: F1-AC-5
  4. 대시보드
  5. 오류: AC-ERROR
- **대시보드 구성**(위에서 아래 순서):
  - D-day 문구
  - 큰 숫자로 "오늘 쓸 수 있는 돈 {todayBudget}"
  - ListRow: 오늘 쓴 돈, 오늘 남은 돈(또는 초과한 돈)
  - 어제 이월 문구(F3-AC-6)
  - Spacing
  - 지출 입력 영역: TextField, 빠른 금액 Chip, "기록하기", "오늘 무지출", "마지막 기록 취소"
  - "오늘 결산 보기" 버튼
- **설정 BottomSheet**: 월급날 TextField와 Chip, 총액 TextField, "저장" 버튼
- **내비게이션**: "오늘 결산 보기"를 누르면 `navigate('/result', { state: RouteState })`

#### Result (/result)
- **Top**: "오늘 결산"
- **상태**: 로딩 → 광고 대기(TossRewardAd) → 결산 표시. 오류가 나면 AC-ERROR를 따른다.
- **[보완] 추가 상태**:
  - 오늘 기록 없음: F4-AC-6
  - 사이클 만료: F4-AC-7 → `/`로 replace
  - 광고 로드 실패 / 시청 중 닫기: AC-AD-FAIL
  - 오프라인: AC-NETWORK
- **[보완] 상태 판정 순서**: 로딩 → 오류(AC-ERROR) → settings 없음(F4-AC-5) → 사이클 만료(F4-AC-7) → 오늘 기록 없음(F4-AC-6) → 오늘 unlock됨이면 결산 표시 → 오프라인(AC-NETWORK) → 광고 대기 → 결산 표시, 또는 광고 실패(AC-AD-FAIL)
- **내용**: 결산 ListRow(F4-AC-3), 주간 7칸과 연속 일수(F4-AC-1, F4-AC-2)
- **하단 버튼**: "홈으로" → `/`

### Data Model
```typescript
// src/lib/types.ts
type DateKey = string; // 'YYYY-MM-DD' (로컬 시간대)

interface BudgetSettings {
  paydayDay: number;      // 1~31
  cycleBudget: number;    // 1,000 ~ 100,000,000
  cycleStart: DateKey;    // 사이클 시작일 (설정일)
  cycleEnd: DateKey;      // 다음 월급날 (이 날 새 사이클)
}

interface DayRecord {
  date: DateKey;
  entries: number[];      // 지출 금액 목록 ([]면 무지출)
  budget: number;         // 기록 시점 todayBudget 스냅샷
}
type RecordMap = Record<DateKey, DayRecord>; // 최근 60일만 보관(쓰기 시 정리)

// AppInput / AppResult
interface AppInput { settings: BudgetSettings; todaySpent: number; }
interface AppResult {
  remainingDays: number;
  todayBudget: number;
  todaySpent: number;
  todayLeft: number;              // 음수 = 초과
  cycleOverspent: number;         // F2-AC-4, 0 이상
  tomorrowBudget: number | null;  // remainingDays === 1이면 null
  yesterdayCarry: number | null;  // F3-AC-6, 해당 없으면 null
  week: { date: DateKey; status: 'success' | 'fail' | 'none' | 'future' }[];
  streak: number;
}

// Route state (react-router useNavigate)
interface RouteState { result: AppResult; input: AppInput; }

// localStorage 키: 'ppd:settings' | 'ppd:records' | 'ppd:adUnlockedDate'

// [보완] 쓰기 결과 (AC-STORAGE-1)
type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unknown' };
```

---

## TASK

### Epic 1: Data Layer

**Task 1: src/lib/types.ts — 타입 정의**
- Covers: F1-AC-3(스키마), F3-AC-4(스키마), **[보완]** AC-STORAGE-1(SaveResult)
- Files: `src/lib/types.ts`
- DoD: Data Model의 모든 타입을 export하고 `tsc --noEmit`이 통과한다.

**Task 2: src/lib/date.ts — 날짜 유틸 (순수 함수)**
- Covers: F1-AC-4, F2-AC-1, F2-AC-5
- Files: `src/lib/date.ts`, `src/lib/date.test.ts`
- 구현 함수: `toDateKey(date)`, `addDays(key, n)`, `diffDays(a, b)`, `nextPayday(today, day)`(말일 보정), `weekKeys(today)`(월~일)
- DoD: F1-AC-4의 4개 케이스, 윤년 2월(2028-02, d=31 → 02-29), `diffDays('2026-10-25', '2026-09-25') === 30` 테스트가 통과한다. vitest가 없으면 devDependency로 추가한다.

**Task 3: src/lib/calculator.ts — 예산 계산 (순수 함수)**
- Covers: F2-AC-2, F2-AC-3, F2-AC-4, F3-AC-5, F3-AC-6
- Files: `src/lib/calculator.ts`, `src/lib/calculator.test.ts`
- 구현 함수: `computeDaily(settings, records, today): Omit<AppResult, 'week' | 'streak'>`
- DoD: 다음 테스트가 통과한다.
  - 총액 500,000원 / remainingDays 5 → todayBudget 100,000원
  - 오늘 120,000원 지출 → todayLeft −20,000원, tomorrowBudget 95,000원
  - 이전 지출이 총액을 넘으면 → todayBudget 0원, cycleOverspent > 0
  - remainingDays 1 → tomorrowBudget null
  - 어제 기록이 cycleStart 이전이면 → yesterdayCarry null
  - **[보완]** 총액 500,000원 / remainingDays 5 / 오늘 55,000원 지출 → tomorrowBudget **111,200원**(floor100 적용. 111,250원이 아님)

**Task 4: src/lib/streak.ts — 주간 상태와 스트릭 (순수 함수)**
- Covers: F4-AC-1, F4-AC-2
- Files: `src/lib/streak.ts`, `src/lib/streak.test.ts`
- 구현 함수: `weekStatus(records, today)`, `calcStreak(records, today)`
- DoD: 다음 테스트가 통과한다.
  - 오늘 미기록, 어제까지 3일 success → 3
  - 오늘 fail → 0
  - 중간에 none이 있으면 그 날에서 멈춤
  - 무지출(entries []) → success
  - 오늘 이후 날짜 → future
  - **[보완]** today 2026-09-20(일요일) → 7번째(마지막) 칸이 오늘이고, 월~토 6칸은 future가 아니다.

**Task 5: src/lib/budgetStore.ts — 저장소 계층 (템플릿 storage.ts 사용)**
- Covers: F1-AC-3, F1-AC-6, F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F4-AC-4, AC-ERROR, **[보완]** AC-STORAGE-1
- Files: `src/lib/budgetStore.ts`, `src/lib/budgetStore.test.ts`
- 구현 함수: `load()`(결과는 `{ ok: true, settings, records } | { ok: false }`), `saveSettings()`(오늘 budget 스냅샷 재계산 포함), `addSpend()`, `markNoSpend()`, `undoLastSpend()`, `isAdUnlockedToday()`, `markAdUnlocked()`, `resetAll()`
- DoD:
  - 깨진 JSON을 넣으면 `ok: false`를 반환한다(throw하지 않음).
  - 쓰기 함수는 성공 여부를 boolean으로 반환한다.
  - 60일이 지난 기록은 정리된다.
  - 단위 테스트가 통과한다.
  - **[보완]** 쓰기 함수의 반환 타입을 `SaveResult`로 바꾼다. boolean 판정은 `result.ok`로 한다.
  - **[보완]** `setItem`이 `QuotaExceededError`를 던지면 30일보다 오래된 기록을 지우고 1회 재시도한다. 재시도에 성공하면 `{ ok: true }`, 실패하면 `{ ok: false, reason: 'quota' }`를 반환한다. 테스트가 통과한다.
  - **[보완]** 쓰기에 실패하면 메모리나 localStorage의 기존 값이 부분적으로 바뀌지 않는다(쓰기 전 값과 동일). 테스트가 통과한다.

**[보완] Task 14: src/lib/numberInput.ts — 숫자 입력 정규화 (순수 함수)** — Task 6 전에 수행한다
- Covers: AC-INPUT-3
- Files: `src/lib/numberInput.ts`, `src/lib/numberInput.test.ts`
- 구현 함수: `normalizeDigits(raw: string, maxDigits: number): string`(숫자 외 문자 제거, 앞자리 0 제거, 자릿수 제한), `toIntOrNull(s: string): number | null`
- DoD: AC-INPUT-3의 테스트 케이스 6개가 모두 통과한다.

### Epic 2: Pages / Components

**Task 6: src/components/SetupSheet.tsx — 설정 BottomSheet**
- Covers: F1-AC-2, F1-AC-6, AC-INPUT-1, AC-INPUT-2, AC-KEYBOARD, AC-A11Y-1, **[보완]** AC-INPUT-3, AC-STORAGE-1(UI)
- Files: `src/components/SetupSheet.tsx`
- Props: `open`, `initial?: { paydayDay; cycleBudget }`, `onSave(paydayDay, cycleBudget)`, `onClose`
- DoD:
  - TDS BottomSheet, TextField, Chip, Button만 사용한다.
  - 범위 밖 값을 넣으면 help 문구가 보이고 저장 버튼이 비활성화된다.
  - "말일" Chip을 누르면 31이 채워진다.
  - 포커스 시 scrollIntoView를 호출한다.
  - 인라인 여백 스타일은 0건이다.
  - **[보완]** 두 TextField 모두 `inputMode="numeric"`이고 onChange에서 `normalizeDigits`를 거친다. 총액은 콤마로 표시된다. "$5,000"을 붙여넣으면 "5,000"으로 보인다.
  - **[보완]** `onSave`가 `SaveResult`를 반환하도록 한다. `ok: false`면 시트를 닫지 않고 입력값을 유지한다.

**Task 7: src/pages/Home.tsx — 상태 뼈대 (로딩/빈 상태/만료/오류)**
- Covers: F1-AC-1, F1-AC-3, F1-AC-5, AC-EMPTY, AC-LOADING, AC-ERROR, **[보완]** AC-STORAGE-1, AC-NETWORK(Home 오프라인)
- Files: `src/pages/Home.tsx`
- DoD:
  - 5가지 상태가 분기된다.
  - Empty State의 "시작하기"를 누르면 SetupSheet가 열린다.
  - 저장하면 Toast가 뜨고 대시보드로 전환된다.
  - cycleEnd가 오늘 이하인 데이터를 넣으면 만료 안내가 보인다.
  - 오류 상태에서 "다시 시도"와 "초기화"(AlertDialog)가 동작한다.
  - **[보완]** 저장 결과가 `reason: 'quota'`면 "저장 공간이 부족해요. 기록을 초기화하면 다시 저장할 수 있어요" Toast를, `'unknown'`이면 기존 AC-ERROR Toast를 보여 준다.
  - **[보완]** 오프라인 상태에서도 설정 저장과 대시보드 표시가 동작한다.

**Task 8: src/components/TodayDashboard.tsx — D-day와 오늘 예산 표시**
- Covers: F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F3-AC-6, AC-FORMAT, AC-A11Y-3
- Files: `src/components/TodayDashboard.tsx`
- Props: `result: AppResult`, `cycleEnd: DateKey`
- DoD:
  - D-5, D-1("내일 월급날이에요"), 초과(빨강 토큰), 예산 소진 경고, 어제 이월 문구가 각각 조건대로 보인다.
  - 금액은 모두 formatCurrency로 출력한다.
  - HEX 색상은 0건이다.

**Task 9: src/components/SpendInput.tsx — 빠른 지출 입력**
- Covers: F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-7, AC-INPUT-1, AC-INPUT-2, AC-KEYBOARD, AC-A11Y-1, **[보완]** AC-INPUT-3, AC-STORAGE-1
- Files: `src/components/SpendInput.tsx`, Home 연결 수정(`src/pages/Home.tsx`)
- DoD:
  - 기록하면 입력 칸이 비워지고 Toast가 뜨며 대시보드가 바로 갱신된다.
  - 빠른 금액 Chip이 입력값에 더해진다.
  - 무지출과 취소 버튼의 활성/비활성 조건이 맞다.
  - 오늘 기록이 있을 때만 "오늘 결산 보기"가 활성화되고, 누르면 RouteState와 함께 `/result`로 이동한다.
  - 저장에 실패하면 실패 Toast가 뜬다.
  - **[보완]** 지출 TextField는 `inputMode="numeric"`, `normalizeDigits(raw, 8)`을 쓰고 콤마로 표시한다. Chip으로 더한 결과가 10,000,000원을 넘으면 AC-INPUT-2 help가 보이고 "기록하기"가 비활성화된다.
  - **[보완]** `setItem`을 throw하도록 mock한 뒤 "기록하기"를 누르면 입력값이 유지되고, 오늘 쓴 돈이 바뀌지 않으며, 성공 Toast가 뜨지 않는다.

**Task 10: src/components/WeekStreak.tsx — 주간 7칸과 연속 일수**
- Covers: F4-AC-1, F4-AC-2, AC-A11Y-2, AC-A11Y-3
- Files: `src/components/WeekStreak.tsx`
- DoD:
  - 7칸을 flex 레이아웃으로 배치한다(이 부분만 커스텀 CSS 허용).
  - 칸마다 aria-label이 있고 크기는 44px 이상이다.
  - "{n}일 연속 예산 지킴"과 "이번 주 {k}/7일 준수" 문구를 formatNumber로 출력한다.

**[보완] Task 15: src/components/ResultAdGate.tsx — 광고 게이트, 실패, 오프라인 처리** — Task 11 전에 수행한다
- Covers: AC-REWARD-2, AC-AD-FAIL, AC-NETWORK, F4-AC-4
- Files: `src/components/ResultAdGate.tsx`. 필요할 때만 `src/components/TossRewardAd.tsx`에 선택형 콜백 prop을 전달하는 코드를 추가한다(AC-REWARD-2 제약 준수).
- Props: `unlocked: boolean`, `children`(결산 내용)
- 동작:
  - `unlocked`면 children을 바로 렌더한다.
  - 그렇지 않고 오프라인이면 AC-NETWORK 안내를 보여 준다.
  - 그 밖에는 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`를 렌더하고, 실패나 닫힘 신호를 받으면 AC-AD-FAIL 안내로 바꾼다.
  - "다시 시도"와 "다시 보기"는 TossRewardAd를 `key` 변경으로 다시 마운트해 광고를 재요청한다.
- DoD:
  - 착수 전에 템플릿 `TossRewardAd`의 실제 props와 완료/실패 처리 방식을 확인하고, 그 결과를 PR 설명에 적는다.
  - 광고 실패를 mock하면 안내와 "다시 시도", "홈으로"가 보이고 결산 텍스트는 0건이다.
  - 닫힘을 mock하면 "다시 보기" 안내가 보이고 `ppd:adUnlockedDate`는 바뀌지 않는다.
  - `navigator.onLine = false`면 광고 요청이 0회이고 오프라인 안내가 보인다.
  - 모든 버튼에 aria-label이 있다.

**Task 11: src/pages/Result.tsx — 리워드 광고 게이팅과 결산**
- Covers: F3-AC-5, F4-AC-3, F4-AC-4, F4-AC-5, AC-REWARD, AC-FORMAT, AC-LOADING, AC-ERROR, **[보완]** F4-AC-6, F4-AC-7, AC-REWARD-2
- Files: `src/pages/Result.tsx`
- DoD:
  - 오늘 unlock 기록이 없으면 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 결산을 감싼다.
  - 결산 내용이 처음 마운트될 때 `markAdUnlocked()`를 호출한다. 같은 날 다시 들어오면 광고 없이 결산이 보인다.
  - settings가 없으면 `/`로 replace 이동한다.
  - state가 없으면 저장소에서 다시 계산한다.
  - "홈으로" 버튼이 동작한다.
  - **[보완]** 게이팅은 T15 `ResultAdGate`로 한다. `markAdUnlocked()`는 `<ResultContent>`의 첫 마운트 `useEffect`에서만 호출한다.
  - **[보완]** Screen Definitions의 "상태 판정 순서"를 그대로 구현한다.
  - **[보완]** `records[today]`가 없으면 F4-AC-6 안내만 보이고 광고 요청은 0회다.
  - **[보완]** today ≥ cycleEnd이면 `/`로 replace 이동한다.

### Epic 3: Integration

**Task 12: src/App.tsx — 라우트 연결**
- Covers: F4-AC-5(라우팅), AC-REVIEW-1
- Files: `src/App.tsx`
- DoD:
  - `/`는 Home, `/result`는 Result를 렌더한다.
  - 알 수 없는 경로는 `/`로 이동한다.
  - 외부 링크는 0건이다.
  - `npm run build`가 성공한다.

**Task 13: 검수 점검 (정적 검사와 수동 QA)**
- Covers: AC-A11Y-1, AC-A11Y-2, AC-A11Y-3, AC-REVIEW-1, AC-REVIEW-2, AC-REVIEW-3, **[보완]** AC-NETWORK, AC-AD-FAIL
- Files: 필요한 경우에만 수정
- DoD:
  - grep 결과 다음이 모두 0건이다: `#[0-9a-fA-F]{3,6}`(src 안 HEX), `console.error`, `http(s)://` 외부 링크, `gtag|amplitude`, 금지 UI 라이브러리(shadcn/MUI/antd/chakra/tailwind) import
  - 모든 `<Button`과 `<TextField`에 aria-label이 있다.
  - 모바일 뷰포트(375×667)에서 키보드를 띄워도 버튼이 가려지지 않는다.
  - **[보완]** grep 결과 `@sentry|datadog|bugsnag` import가 0건이다(AC-REVIEW-3).
  - **[보완]** 수동 QA: 오프라인 모드에서 Home의 설정·기록·취소가 동작하고, /result는 오프라인 안내를 보여 준다. 온라인으로 바꾼 뒤 "다시 시도"를 누르면 광고가 요청된다.
  - **[보완]** 수동 QA: /result URL에 직접 들어갔을 때 (a) 오늘 기록이 없으면 안내가 보이고 (b) 만료 사이클이면 `/`로 이동한다.

---

## AC Coverage
- **Total**: 44개 (기능 AC 25개 + 필수 AC 19개) — **[보완]** 기존 37개에 7개를 더했다.
- **Covered**: 44개 (100%)

| AC | Task |
|---|---|
| F1-AC-1 ~ 6 | T7 / T6 / T5·T7 / T2 / T7 / T5·T6 |
| F2-AC-1 ~ 5 | T2·T8 / T3·T8 / T3·T8 / T3·T8 / T2·T8 |
| F3-AC-1 ~ 7 | T5·T9 / T5·T9 / T5·T9 / T5 / T3·T11 / T3·T8 / T9 |
| F4-AC-1 ~ 5 | T4·T10 / T4·T10 / T11 / T5·T11·T15 / T11·T12 |
| **[보완]** F4-AC-6, 7 | T11, T13 / T11, T13 |
| AC-INPUT-1, 2 | T6, T9 |
| **[보완]** AC-INPUT-3 | T14, T6, T9 |
| AC-EMPTY | T7 |
| AC-LOADING | T7, T11 |
| AC-ERROR | T5, T7, T11 |
| **[보완]** AC-STORAGE-1 | T1, T5, T6, T7, T9 |
| AC-A11Y-1 | T6, T9, T13 |
| AC-A11Y-2 | T10, T13 |
| AC-A11Y-3 | T8, T10, T13 |
| AC-REWARD | T11 |
| **[보완]** AC-REWARD-2 | T15, T11 |
| **[보완]** AC-AD-FAIL | T15, T13 |
| **[보완]** AC-NETWORK | T15, T7, T13 |
| AC-FORMAT | T8, T11 |
| AC-REVIEW-1 | T12, T13 |
| AC-REVIEW-2, 3 | T13 |
| AC-KEYBOARD | T6, T9 |

- **Uncovered**: 0개
- **[보완] 권장 실행 순서**: T1 → T2 → T3 → T4 → T5 → **T14** → T6 → T7 → T8 → T9 → T10 → **T15** → T11 → T12 → T13

---

### 설계 결정 메모
- **이월 방식**: 남은 예산 ÷ 남은 일수로 매일 다시 계산하는 방식을 택했다. 그래서 오늘 남긴 돈이나 초과한 돈은 내일 예산에 한꺼번에 들어가지 않고 남은 날짜 전체에 나눠 반영된다(F3-AC-5, F3-AC-6). 한꺼번에 이월하면 전날 크게 초과했을 때 다음 날 예산이 음수가 될 수 있어서 이 방식을 선택했다.
- **광고 빈도**: 매일 여는 앱이라 결산 리포트만 하루 1회 광고로 여는 것으로 제한했다(F4-AC-4). 오늘 예산과 D-day는 무료로 보여 준다.
- **예상 수익의 DAU 1,000명**은 계산을 보여 주기 위한 가정이다. 아이디어 브리프에 DAU 수치는 없다.
- **[보완] 광고 실패 시 강제 해제 안 함**: 핵심 가치(오늘 예산, D-day)는 광고 없이 홈에서 볼 수 있다. 그래서 광고가 실패해도 사용자가 핵심 기능을 못 쓰는 일은 없다. 강제 해제는 수익 모델을 우회하는 경로가 되므로 넣지 않았다. 재시도는 사용자가 버튼을 누를 때만 한다(AC-AD-FAIL).
- **[보완] 오늘 기록 없는 /result**: 0원 결산을 보여 주거나 의미 없는 광고를 요청하지 않고 안내만 보여 준다(F4-AC-6).
- **[보완] 입력 형식**: 오류 문구를 늘리지 않고 입력 단계에서 숫자만 남기는 방식을 택했다(AC-INPUT-3). 범위 안내는 기존 AC-INPUT-2 문구 3개를 그대로 쓴다.
- **[보완] 시뮬레이션 제안 중 반영하지 않은 것**:
  - 자동 재시도(백오프)와 `online` 이벤트 자동 재요청은 반영하지 않았다. MVP 범위를 넘고, 사용자가 원하지 않을 때 광고가 뜰 수 있다. 수동 "다시 시도"로 대체했다.
  - `@sentry/react` 도입은 AC-REVIEW-3(외부 로깅 SDK 0건)과 충돌해 제외했다.
- **[보완] 시뮬레이션 수치 정정**:
  - 시나리오 3의 내일 예산은 floor100을 적용하면 111,200원이다. 111,250원이 아니다(T3 테스트에 추가).
  - 2026-09-20은 일요일이다. 그래서 주간 7칸에서 오늘은 5번째가 아니라 마지막 칸이다(T4 테스트에 추가).
🇺🇸 [한국어](./README.ko.md)

# PaydayPerDay — Smart Daily Budget Calculator

A Toss mini-app that calculates your daily spending budget from payday to payday. Set your payday and monthly budget once, then track daily spending with an auto-rolling budget that redistributes savings or overages to remaining days.

For Korean users aged 20–30 who struggle with overspending after payday and need a quick daily spending limit to manage cash flow until the next paycheck.

## Features

- 📅 **Budget Setup** — Enter payday (1–31) and monthly budget; app calculates daily limits and D-day countdown
- 💰 **Quick Spending Entry** — Log today's spending once; budget auto-recalculates for tomorrow based on balance carry-over
- 📊 **Daily Settlement Report** — See today's balance, tomorrow's budget, and weekly compliance streak (requires rewarded ad view)
- ✓ **Weekly Compliance Tracker** — Track success/fail/none status for each day of the week; continuous budget-adherence streak counter
- 💾 **Local Persistence** — All data stored securely on device via localStorage; no backend required

## Tech Stack

- **Frontend**: React 18 + Vite
- **Router**: React Router 7
- **UI Components**: TDS Mobile (Toss Design System)
- **Native SDK**: @apps-in-toss/web-framework (haptic feedback, reward ads, native storage)
- **Styling**: Emotion (CSS-in-JS)
- **Language**: TypeScript
- **Storage**: browser localStorage
- **Testing**: Vitest + @testing-library/react + Playwright

## Getting Started

### Prerequisites
- Node.js 18+ (npm or pnpm)

### Installation

```bash
npm install
```

### Build for Production

```bash
npx vite build
```

Outputs optimized static bundle to `dist/`.

### Deploy to Toss (App-in-Toss)

```bash
npx ait build
```

Then follow the [Toss Developer Console](https://console.tossmini.com) review flow to deploy to production.

### Run Tests

```bash
npx vitest run           # Unit tests
npm run test:visual      # Visual regression (Playwright)
npm run typecheck        # TypeScript check
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AIT_APP_NAME` | App name registered in Toss console (set in `apps-in-toss.config.ts`) | Yes |

## Project Structure

```
src/
├── pages/               # Route screens (Home, Result)
├── components/          # Reusable UI components (pre-built TDS wrappers)
├── lib/
│   ├── calculator.ts    # Daily budget math (todayBudget, carry-over)
│   ├── streak.ts        # Weekly compliance & streak calculation
│   ├── budgetStore.ts   # localStorage + quota handling
│   ├── date.ts          # Date utilities (cycleStart, cycleEnd, D-day)
│   ├── types.ts         # Shared TypeScript interfaces
│   └── utils.ts         # Helpers (currency formatting, etc.)
└── __tests__/           # Unit & component tests

.ai-factory/
├── spec.md              # Full product specification
├── apps-in-toss-essential.txt  # Verified SDK API reference
└── tds-reference.txt    # TDS component documentation
```

## Deployment

PaydayPerDay is deployed as a **Toss mini-app** (App-in-Toss). After building locally:

1. Run `npx ait build` to create the Toss-compatible bundle
2. Submit the bundle through the [Toss Developer Console](https://console.tossmini.com)
3. Pass Toss review (age 19+, no external links, no console errors, CORS-free, dark mode support)
4. App is hosted on Toss CDN and delivered via QR code / deep link (`intoss://paydayperday`)

Note: local dev server (`npm run dev`) is not documented because verification happens via `npm run test:visual` (Playwright) and production build only.

## License

MIT

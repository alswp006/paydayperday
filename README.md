🇺🇸 [한국어](./README.ko.md)

# 월급계기판 — PaydayPerDay Spending Tracker for Toss

A daily budget tracker that calculates how much you can safely spend each day until your next payday. Set your payday date and monthly budget once, then track spending and watch your budget compliance streak grow.

**Target users**: Young adults who receive monthly salaries and want to avoid overspending before the next paycheck. **Core value**: See "D-11 to payday, ₩38,000 to spend today" instantly—without manual calculations.

## Features

- 🎯 **Daily Budget Calculation** — Automatically divides remaining budget by remaining days, rebalances when you spend more or less
- 📝 **One-Click Spend Recording** — Log spending with quick amount shortcuts (+₩5K, +₩10K, +₩30K) or manual entry
- 📊 **Today's Settlement** — View today's overage/savings, tomorrow's budget, and weekly compliance status (✓ success / ✕ overage / · no record)
- 🔥 **Budget Streak Counter** — Track consecutive days of staying within daily budget; resets on overage
- 💾 **Local Persistence** — All data stored in browser (no server, no account needed)
- 🎬 **Reward Ad Gate** — Watch one ad per day to unlock today's settlement report
- ↩️ **Undo & No-Spend Tracking** — Cancel last entry or record days with zero spending

## Tech Stack

- **Frontend**: React 18, React Router 7.5, Vite 6.3
- **UI**: Toss Design System (TDS) mobile components, Emotion CSS-in-JS
- **Runtime**: Apps-in-Toss SDK (mini-app WebView, native haptic feedback, reward ads)
- **Storage**: Browser localStorage (no backend)
- **Icons**: Lucide React

## Getting Started

### Install dependencies
```bash
npm install
```

### Build for production
```bash
npx vite build
```

This creates a static bundle in `dist/`. The app is a client-side Vite + React build (no server-side rendering).

### Deploy to Toss Apps-in-Toss
```bash
npx ait build      # Bundles for Toss CDN
npx ait deploy     # Pushes to production (requires API key)
```

## Environment Variables

No environment variables required. All configuration (app name, brand color) is set at build time in `apps-in-toss.config.ts`.

## Project Structure

```
src/
├── pages/              # Page components (Home, Result)
├── components/         # UI components (ScreenScaffold, SummaryHero, etc.)
├── lib/
│   ├── calculator.ts   # Daily budget & streak logic
│   ├── budgetStore.ts  # localStorage wrapper
│   ├── date.ts         # Date utilities (payday calculation)
│   ├── streak.ts       # Streak & weekly status
│   └── types.ts        # Shared TypeScript types
├── __tests__/          # Vitest + React Testing Library tests
└── App.tsx             # Router & top-level layout
```

**Key files**:
- `src/lib/calculator.ts` — Core formula: `todayBudget = (totalBudget − spentSoFar) / remainingDays` with 100-won rounding
- `src/lib/budgetStore.ts` — Persistent state (settings, daily records, ad unlock status)
- `src/pages/Home.tsx` — Dashboard with daily budget, spend input, settlement button
- `src/pages/Result.tsx` — Settlement report with weekly grid, streak, and next day's budget

## Deployment

This is an **Apps-in-Toss mini-app** that runs inside the official Toss mobile app.

1. **Register the app** in the Toss Developer Console with name `paydayperday`
2. **Build**: `npx vite build` (or `npx ait build` for the Toss-specific bundle)
3. **Test locally**: QR code from console opens the bundled app in Toss sandbox
4. **Deploy**: `npx ait deploy --api-key YOUR_KEY` (pushes to Toss CDN)
5. **Review**: Toss team reviews for compliance (no external links, TDS UI only, zero console errors)

On success, the app appears in the official Toss app store at `intoss://paydayperday`.

## License

MIT

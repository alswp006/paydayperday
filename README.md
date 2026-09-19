# PaydayPerDay

> **이번 보완 요약**: 기존 내용은 그대로 두고, 새로 넣은 AC와 Task 항목에만 **[보완]** 표시를 달았습니다. 추가한 AC는 7개입니다: F4-AC-6, F4-AC-7, AC-INPUT-3, AC-STORAGE-1, AC-AD-FAIL, AC-REWARD-2, AC-NETWORK. 새 Task는 2개입니다: T14, T15. - **한줄 요약**: 다음 월급날까지 D-11, 오늘 쓸 수 있는 돈은 38,000원. 매일 열어 보는 하루 생활비 계기판 - **문제**: 월급이 들어오면 돈을 많이 쓰고 월말에 돈이 모자란다. 남은 돈을 남은 날짜로 나눠 하루 예산을 매일 계산해 주는 도구가 없다.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Home` | Home |
| `/Result` | Result |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-09-19

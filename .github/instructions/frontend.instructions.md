---
applyTo: "frontend/src/**,frontend/package.json,frontend/vite.config.ts,frontend/tsconfig*.json,frontend/tailwind.config.ts,frontend/postcss.config.js"
---

# Frontend Specialist Instructions

## Role And Scope

Own the React/Vite/TypeScript frontend: pages, components, hooks, Zustand state, TanStack Query usage, charting, API client calls, and shared frontend contracts.

## Inspect First

For frontend work, inspect:
- `frontend/src/App.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`
- `frontend/src/store/useAppStore.ts`
- The affected page/component/hook under `frontend/src/pages/`, `frontend/src/components/`, or `frontend/src/hooks/`

For chart and indicator work, also inspect:
- `frontend/src/components/CandlestickPanel.tsx`
- `frontend/src/workers/indicatorWorker.ts`

## Allowed Changes

- React pages, components, hooks, store, CSS, Tailwind usage.
- API client methods in `frontend/src/lib/api.ts`.
- Shared TypeScript types in `frontend/src/lib/types.ts`.
- Browser worker calculations when client-side indicators need main-thread protection.
- Frontend tests only when package scripts and dependencies support them.

## Must Preserve

- API calls centralized in `frontend/src/lib/api.ts`.
- Shared API shapes in `frontend/src/lib/types.ts`.
- TanStack Query for server state.
- Zustand for lightweight app state only.
- SSE quote stream plus polling fallback unless intentionally changing realtime behavior.
- Heavy chart-side calculations outside the main thread.

## Must Not Do

- Do not invent backend endpoints or fields.
- Do not silently change contracts without matching backend/schema updates.
- Do not add heavy UI frameworks or duplicate charting libraries without strong need.
- Do not hardcode deployment URLs when `VITE_API_BASE_URL` and nginx proxy behavior exist.
- Do not present AI, screener, options, or portfolio output as financial advice.

## Repo-Specific Intelligence

- Main tabs are in `AppShell.tsx`; pages include dashboard, screener, charts, watchlists, portfolio, news, and AI Ops diagnostics.
- `useQuoteStream.ts` currently opens `/api/v1/market/stream` directly rather than using `VITE_API_BASE_URL`.
- `ScreenerPage.tsx` sends debounced server-side filters to `/screener/run`.
- `WatchlistsPage.tsx` contains symbol management, alerts, CSV import, AI watchlist settings, manual AI runs, summary, and stock analysis detail.
- `ChartsPage.tsx` fetches history and options chain snapshots.
- `CandlestickPanel.tsx` uses `lightweight-charts` and a worker for indicators/support/resistance.
- Frontend test files exist, but `package.json` currently lacks a test script and Vitest/testing-library/jsdom dependencies.

## Validation

Run for frontend changes:
```bash
cd frontend
npm run build
```

If API payloads change, confirm `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`, and backend schemas/services all agree.

## Coordination

Coordinate with backend for endpoint and payload changes, market-data for freshness/source/fallback fields, quant-risk for financial language, and QA/security for forms, CSV import, error surfaces, and dependency changes.

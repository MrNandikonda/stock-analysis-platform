# FRONTEND AGENT

## Role And Scope

You own the React/Vite/TypeScript frontend under `frontend/src/`. You build and maintain the dashboard, screener, charts, watchlists, portfolio, news, AI diagnostics, shared UI components, hooks, client API calls, and frontend types.

Use this with `.github/instructions/frontend.instructions.md`.

## Inspect First

For any frontend task, inspect:
- `frontend/src/App.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`
- `frontend/src/store/useAppStore.ts`
- The affected page/component/hook under `frontend/src/pages/`, `frontend/src/components/`, or `frontend/src/hooks/`

For chart/indicator work, also inspect:
- `frontend/src/components/CandlestickPanel.tsx`
- `frontend/src/workers/indicatorWorker.ts`

## Allowed Changes

- React pages, components, hooks, store, CSS, Tailwind usage.
- API client methods in `frontend/src/lib/api.ts`.
- Shared TypeScript contracts in `frontend/src/lib/types.ts`.
- Browser worker calculations when the UI needs client-side indicators.
- Frontend test setup only when `package.json` scripts and dependencies support it.

## Must Preserve

- API calls stay centralized in `frontend/src/lib/api.ts`.
- Shared API shapes stay in `frontend/src/lib/types.ts`.
- TanStack Query remains the server-state pattern.
- Zustand remains lightweight app state, not a broad data cache.
- SSE plus polling fallback remains unless deliberately changed.
- Heavy calculations stay out of the main thread.

## Must Not Do

- Do not invent backend endpoints or fields.
- Do not silently change API contracts without backend/schema updates.
- Do not add heavy UI frameworks or charting libraries without strong need.
- Do not hardcode deployment URLs when an env-driven base URL exists.
- Do not present AI, screener, portfolio, or options output as financial advice.

## Repo-Specific Intelligence

- Main tabs are declared in `AppShell.tsx`.
- Current pages include dashboard, screener, charts, watchlists, portfolio, news, and AI diagnostics.
- `useQuoteStream.ts` currently opens `/api/v1/market/stream` directly; treat this as a known coupling if API base behavior changes.
- Screener UI sends debounced server-side filters to `/screener/run`.
- Watchlist AI controls and analysis details live in `WatchlistsPage.tsx`.
- `QuotesTable` expects `QuoteItem` fields from `stock_metrics` plus stock metadata.
- Frontend test files exist, but `frontend/package.json` must be checked before claiming tests are runnable.

## Validation

Run:
```bash
cd frontend
npm run build
```

Also verify API type alignment when backend payloads change.

## Coordination

- Coordinate with BACKEND for any endpoint or payload changes.
- Coordinate with QUANT_RISK for indicator, screener, signal, or risk language.
- Coordinate with MARKET_DATA when UI displays freshness, provider, exchange, or fallback state.
- Coordinate with QA_SECURITY for forms, CSV import UX, error surfaces, and auth-sensitive flows.

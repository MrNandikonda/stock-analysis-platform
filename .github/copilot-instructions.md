# Copilot Operating Manual

## Project Identity

`stock-analysis-platform` is a lightweight, self-hosted stock screening and analysis web app intended to run on a Windows laptop with Docker Desktop/WSL2.

Confirmed repo scope:
- Markets and assets: NSE plus US market buckets backed by `NSE`, `NYSE`, and `NASDAQ` exchanges; seed data includes stocks, ETFs, and indices such as `SPY`, `QQQ`, `NIFTY50`, `BANKNIFTY`, and `^GSPC`.
- User workflows: dashboard quotes, market status, stock screeners and presets, candlestick charts, options snapshots, watchlists, alerts, portfolio tracking, RSS news sentiment, earnings calendar fallback, AI watchlist analysis, and AI diagnostics.
- Runtime target: local Docker Compose with resource limits, SQLite persistence, a separate scheduler container, and nginx frontend proxying `/api/` to the backend.
- Product stance: research support only. This app is not a broker, trading bot, execution engine, or financial adviser.

Keep the platform laptop-friendly: low memory, bounded background work, SQLite, FastAPI, React/Vite, and Docker Compose. Do not introduce Redis, Postgres, Kafka, Celery, Kubernetes, or broker/execution infrastructure unless the user explicitly asks and approves the scope.

## Copilot Instruction Model

Use this file as the repository-wide operating manual. Also use the path-specific files in `.github/instructions/` when a task touches their areas:
- `repo-architect.instructions.md` - orchestration, planning, cross-stack coordination, scope control.
- `frontend.instructions.md` - React/Vite UI, pages, components, hooks, state, charts, API client types.
- `backend.instructions.md` - FastAPI, services, schemas, models, migrations, scheduler, AI backend.
- `market-data.instructions.md` - yfinance, nsepython, RSS, symbol search, quotes, history, fundamentals, options, freshness.
- `quant-risk.instructions.md` - screeners, indicators, portfolio analytics, risk semantics, AI signal language.
- `devops-docker.instructions.md` - Docker, nginx, `.env.example`, Windows laptop hosting, Cloudflare Tunnel.
- `qa-security.instructions.md` - tests, contracts, secrets, auth/CORS/rate limits, performance and regression checks.

Repository-wide guidance overrides specialist guidance if there is a conflict. For cross-cutting changes, apply every relevant specialist file and validate the contracts between layers.

## Architecture Snapshot

Backend:
- Entry point: `backend/app/main.py`
- Routers: `backend/app/api/` plus AI router at `backend/app/ai/router.py`
- Services: `backend/app/services/`
- Data adapters: `backend/app/data_sources/yfinance_adapter.py`, `backend/app/data_sources/nse_adapter.py`
- Config/cache/rate limit/database: `backend/app/core/`
- ORM models: `backend/app/models/entities.py`, `backend/app/models/ai_entities.py`
- Schemas: `backend/app/schemas/` plus AI contracts in `backend/app/ai/schemas.py`
- Scheduler: `backend/app/services/scheduler_service.py`, process entry `backend/app/scheduler_runner.py`

Database:
- SQLite via async SQLAlchemy.
- SQL-first migrations in `backend/migrations/*.sql`, applied by `backend/migrations/run_migrations.py`.
- Migration tracking table: `schema_migrations`.
- Core tables include `stocks`, `price_history`, `fundamentals`, `stock_metrics`, `watchlists`, `watchlist_items`, `portfolio`, `portfolio_history`, `alerts`, and `screener_presets`.
- AI tables include provider config, watchlist settings, jobs, agent runs, stock analyses, factors, source refs, alert rules, and audit logs.

Frontend:
- React 18 + Vite + TypeScript + Tailwind.
- App entry: `frontend/src/main.tsx`, `frontend/src/App.tsx`.
- Shell and navigation: `frontend/src/components/AppShell.tsx`.
- Pages: `frontend/src/pages/`.
- Shared UI: `frontend/src/components/`.
- API client: `frontend/src/lib/api.ts`.
- Shared types: `frontend/src/lib/types.ts`.
- App state: `frontend/src/store/useAppStore.ts`.
- SSE hook: `frontend/src/hooks/useQuoteStream.ts`.
- Chart-side calculations: `frontend/src/workers/indicatorWorker.ts`.

Deployment:
- `docker-compose.yml` defines `backend`, `scheduler`, `frontend`, and optional `cloudflared`.
- Backend and scheduler share the backend image and the `screener_data` SQLite volume.
- Frontend nginx config is `frontend/nginx.conf`.
- Backend Dockerfile is currently multi-stage `python:3.11-slim`; compose image names still include `:alpine`.
- Frontend Dockerfile builds with Node 20 Alpine and serves via nginx Alpine.

## Current API Surface

Default API prefix is `/api/v1` from `API_PREFIX`.

Confirmed routes include:
- `GET /health`
- `GET /market/status`
- `GET /market/quotes`
- `GET /market/search`
- `POST /market/refresh`
- `GET /market/history/{symbol}`
- `GET /market/options/{symbol}`
- `GET /market/stream`
- `POST /screener/run`
- `GET/POST/DELETE /screener/presets`
- `GET/POST /watchlists`
- `POST/DELETE /watchlists/{id}/items`
- `POST /watchlists/{id}/import-csv`
- `GET/POST /watchlists/alerts`
- `POST /watchlists/alerts/check`
- `GET/POST/DELETE /portfolio`
- `GET /portfolio/summary`
- `GET /portfolio/history`
- `POST /portfolio/import-csv`
- `GET /news`
- `GET /news/earnings-calendar`
- `GET /ai/status`
- `GET/PUT /ai/watchlists/{id}/settings`
- `POST /ai/watchlists/{id}/run`
- `GET /ai/watchlists/{id}/summary`
- `GET /ai/watchlists/{id}/analyses`
- `GET /ai/watchlists/{id}/analyses/{symbol}`
- `GET /ai/diagnostics`

Do not invent endpoints, fields, env vars, tables, providers, or UI flows. If a desired contract does not exist, inspect the repo, propose the smallest additive change, and update backend schemas, frontend API client, and shared types together.

## Data Providers And Freshness

Confirmed providers:
- `YFinanceAdapter` uses `yfinance` for quotes, history, fundamentals, and US options-chain parsing.
- `NSEAdapter` uses `nsepython` for NSE quotes and options.
- `NewsService` uses RSS feeds and VADER sentiment.
- AI providers are `local-summary` and optional OpenAI Responses API via server-side `OPENAI_API_KEY`.

Important caveats:
- `MarketService.search_symbol` validates a query against NSE and yfinance before watchlist/portfolio insertion.
- `YFinanceAdapter.get_fundamentals` can return synthetic fallback fundamentals after provider failure.
- `NSEAdapter.get_options_chain` can return synthetic fallback options after provider failure.
- News earnings calendar is a lightweight fallback, not a verified live earnings feed.
- Data freshness depends on `updated_at`, source refs, cache TTLs, scheduler cadence, and provider success.

Copilot must keep live, cached, stale, missing, error, fallback, and synthetic data clearly distinguishable in code, docs, and UI when surfaced.

## Financial And Market Intelligence Rules

Use senior engineering and capital-markets research judgment, but never make reckless or guaranteed financial claims.

Always separate:
- Raw data: quotes, OHLCV, fundamentals, RSS items, options rows.
- Derived indicators: RSI, MACD, SMA, returns, volume spike, PCR, IV, max pain, XIRR.
- Strategy signals: screener matches, rankings, AI scores, bullish/bearish labels.
- Context: news, macro, sector, geopolitical, regulation, source health.
- User decisions: buy/sell/hold, sizing, timing, suitability, and risk tolerance.

All financial output must be framed as research support, screening support, scenario analysis, or risk-aware insight. Prefer language such as "screens as", "suggests", "adds risk", "requires confirmation", and "low-confidence context". Avoid language such as "will", "guaranteed", "buy now", "risk-free", or "certain outcome".

## Working Rules

For every task:
1. Inspect relevant files first.
2. Explain the current state before major changes.
3. Propose a minimal file-level plan.
4. Call out API contract, migration, scheduler, Docker, data-provider, financial-output, and security risks when applicable.
5. Implement the smallest cohesive patch.
6. Validate with the relevant commands.
7. Report what passed, what was not run, and why.

Preserve:
- `/api/v1` compatibility.
- FastAPI + async SQLAlchemy + SQLite.
- React/Vite/TypeScript frontend architecture.
- Central frontend API calls in `frontend/src/lib/api.ts`.
- Shared frontend contracts in `frontend/src/lib/types.ts`.
- SQL-first additive migrations.
- Scheduler jobs with bounded cadence, `max_instances=1`, coalescing, and safe rollback.
- AI persistence through `backend/app/ai/services/persistence_service.py`.
- Optional Basic Auth, CORS, endpoint rate limiting, and server-side secrets.

Never:
- Hardcode secrets or expose provider keys to the frontend.
- Rewrite applied migrations unless the user explicitly approves.
- Silently swap live provider behavior for mock data.
- Add unbounded provider fanout or long blocking request work.
- Scatter direct DB writes from AI agents.
- Break Docker Compose service responsibilities.
- Treat the app as a live trading or order-execution system.

## Validation Matrix

Documentation-only changes:
```bash
git diff --check
```

Backend/API/service changes:
```bash
cd backend
python -m compileall app
python -m pytest -q
```

Frontend changes:
```bash
cd frontend
npm run build
```

Migration/schema changes:
```bash
DB_PATH=/tmp/stocks_migration_test.db python backend/migrations/run_migrations.py
DB_PATH=/tmp/stocks_migration_test.db python backend/migrations/run_migrations.py
```

Scheduler changes:
```bash
cd backend
python -m compileall app
python -m pytest -q
python -m app.scheduler_runner
```
Start the scheduler only long enough to confirm startup, then stop it cleanly.

Docker/deployment changes:
```bash
docker compose config
docker compose build backend
docker compose build frontend
```
Build only affected services when practical.

Known test caveat: frontend test files and Vitest config exist, but `frontend/package.json` currently has no `test` script and does not list Vitest/testing-library/jsdom dependencies. Do not claim frontend tests are runnable until the manifest supports them.

## Existing Assistant Files

`AGENTS.md` is the current Codex operating guide and should stay aligned with this Copilot manual when architecture changes.

`GEMINI.md` and `.gemini/` contain useful Gemini-specific guidance and specialist prompts. Use them as historical input, but prefer this `.github/` system for Copilot. If they drift from the live repo, update or archive them in a separate explicit cleanup task rather than letting conflicting assistant manuals accumulate.

# Gemini Code Assist Operating Manual

This file is the main operating manual for Gemini Code Assist in this repository. It is based on the current codebase, not desired architecture.

## 1. Project Identity

`stock-analysis-platform` is a lightweight, self-hosted stock screening and analysis web app for a Windows laptop running Docker Desktop/WSL2.

Current scope confirmed in the repo:
- Markets: NSE plus US equities/ETFs/indices represented as `NSE`, `NYSE`, `NASDAQ`, and UI market bucket `US`.
- User workflows: dashboard quotes, market status, screeners, screener presets, technical charts, options snapshots, watchlists, alerts, portfolio tracking, RSS news sentiment, earnings calendar, and AI watchlist analysis.
- Runtime target: local Docker Compose, SQLite volume, bounded backend/scheduler containers, nginx frontend proxy.
- Product stance: research and analysis support only. This app is not a broker, execution engine, trading bot, or financial adviser.

The platform should stay laptop-friendly: low memory, bounded background work, no heavy infrastructure, and no broad rewrites unless explicitly requested.

## 2. Current Architecture

Backend:
- FastAPI entry point: `backend/app/main.py`
- Routers: `backend/app/api/`
- Service layer: `backend/app/services/`
- Data adapters: `backend/app/data_sources/`
- Database config: `backend/app/core/database.py`
- Runtime config: `backend/app/core/config.py`
- Cache/rate limit helpers: `backend/app/core/cache.py`, `backend/app/core/rate_limit.py`
- Scheduler runner: `backend/app/scheduler_runner.py`

Database:
- SQLite through async SQLAlchemy.
- SQL-first migrations in `backend/migrations/*.sql`.
- Migration runner: `backend/migrations/run_migrations.py`.
- Core models: `backend/app/models/entities.py`.
- AI models: `backend/app/models/ai_entities.py`.
- Important tables include `stocks`, `price_history`, `fundamentals`, `stock_metrics`, `watchlists`, `watchlist_items`, `portfolio`, `alerts`, `screener_presets`, and AI analysis tables.

Frontend:
- React 18, Vite, TypeScript, Tailwind.
- App entry: `frontend/src/App.tsx`, `frontend/src/main.tsx`.
- Pages: `frontend/src/pages/`.
- Components: `frontend/src/components/`.
- API client: `frontend/src/lib/api.ts`.
- Shared frontend types: `frontend/src/lib/types.ts`.
- App state: `frontend/src/store/useAppStore.ts`.
- Quote stream hook: `frontend/src/hooks/useQuoteStream.ts`.
- Indicator worker: `frontend/src/workers/indicatorWorker.ts`.

Deployment:
- Compose file: `docker-compose.yml`.
- Services: `backend`, `scheduler`, `frontend`, optional `cloudflared` profile.
- Backend image is reused by `scheduler`.
- Shared SQLite volume: `screener_data`.
- Frontend nginx proxies `/api/` to `backend:8000`.
- Public host/domain and Cloudflare Tunnel options are documented in `README.md`.

AI subsystem:
- Domain root: `backend/app/ai/`.
- Router: `backend/app/ai/router.py`, included under `/api/v1/ai`.
- Orchestrator: `backend/app/ai/orchestrator.py`.
- Specialist agents: `backend/app/ai/agents/`.
- Provider abstraction: `backend/app/ai/providers/`.
- Typed contracts: `backend/app/ai/schemas.py`.
- Tool registry: `backend/app/ai/tool_registry.py`.
- Controlled persistence: `backend/app/ai/services/persistence_service.py`.
- Progress tracker: `docs/ai_watchlist_analysis_tracker.md`.

## 3. API And Data Flow

API prefix is configured by `API_PREFIX` and defaults to `/api/v1`.

Current API surfaces:
- `GET /health`
- `GET /market/status`
- `GET /market/quotes`
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
- `POST /portfolio/import-csv`
- `GET /news`
- `GET /news/earnings-calendar`
- `GET/PUT /ai/watchlists/{id}/settings`
- `POST /ai/watchlists/{id}/run`
- `GET /ai/watchlists/{id}/summary`
- `GET /ai/watchlists/{id}/analyses`
- `GET /ai/watchlists/{id}/analyses/{symbol}`
- `GET /ai/status`
- `GET /ai/diagnostics`

Primary flow:
1. Frontend calls `frontend/src/lib/api.ts`.
2. FastAPI routers validate requests and call service classes.
3. Services use async SQLAlchemy sessions and adapter classes.
4. Market provider results are stored in SQLite, mostly in `stock_metrics`, `price_history`, and `fundamentals`.
5. UI polling and SSE read the cached/stored data for lightweight refresh.

## 4. Data Providers And Freshness

Confirmed providers/adapters:
- `backend/app/data_sources/yfinance_adapter.py` uses `yfinance` for quotes, history, and fundamentals.
- `backend/app/data_sources/nse_adapter.py` uses `nsepython` for NSE quote/options data.
- `backend/app/services/news_service.py` uses RSS feeds plus VADER sentiment.

Important constraints:
- Do not invent a provider, field, endpoint, exchange, or schema.
- Do not silently replace live data with mock data in production behavior.
- If fallback/synthetic data is used, label it clearly in docs/UI/API payloads when practical.
- Always carry timestamps/freshness where analysis depends on data age.
- Respect `YFINANCE_HOURLY_LIMIT`, `API_RATE_LIMIT_PER_MINUTE`, cache TTLs, and scheduler cadence.

Current known caveats:
- Unknown watchlist/portfolio symbols are currently inserted as NASDAQ defaults in services.
- There is no confirmed dedicated symbol-search API endpoint.
- US options support currently follows the existing options snapshot shape and is not a full verified US options-chain integration.
- Earnings calendar has a lightweight fallback path.

## 5. Financial And Market Intelligence Rules

The embedded expert stance is: senior software architect plus experienced capital-markets research assistant. Use that judgment to build safer tools, not to overstate certainty.

Always separate:
- Raw data: quotes, OHLCV, fundamentals, RSS items, options rows.
- Derived indicators: RSI, MACD, SMA, returns, volume spike, PCR, IV, portfolio XIRR.
- Strategy signals: screen matches, rankings, AI scores, bullish/bearish labels.
- Context: news, macro, sector, geopolitical, regulation, source health.
- User decisions: anything involving buy/sell/hold, position size, risk tolerance, or timing.

Rules:
- Treat all outputs as research support, screening support, scenario analysis, and risk-aware insight.
- Never present speculation, forecasts, or model output as fact.
- Never guarantee returns, price targets, fills, or risk outcomes.
- Prefer explainable, auditable signal logic over opaque scores.
- Highlight stale, sparse, missing, fallback, or low-confidence data.
- Keep geopolitical and macro commentary cautious, sourced, and explicitly labeled as context.
- Do not build automated trading execution loops unless the repo explicitly changes direction and the user explicitly asks.

## 6. Agent Working Rules

Every Gemini session must:
1. Inspect relevant files first.
2. Explain the current state before major changes.
3. Propose a minimal file-level plan.
4. Call out API contract, migration, scheduler, Docker, data freshness, and financial-analysis risks.
5. Implement focused changes only.
6. Validate with the smallest sufficient checks.
7. Report what passed, what was not run, and why.

Never:
- Invent APIs, providers, schemas, env vars, tables, jobs, or UI flows.
- Hardcode secrets or log secrets.
- Rewrite applied migrations.
- Replace live market behavior with silent mocks.
- Break `/api/v1` compatibility.
- Scatter DB writes outside service/persistence boundaries.
- Add Redis, Postgres, Kafka, Celery, Kubernetes, or other heavy infrastructure without explicit direction.
- Expand scope into production trading, brokerage, or execution features.

Prefer:
- Repo-native patterns over new abstractions.
- Additive migrations and backward-compatible API changes.
- Bounded loops, bounded fanout, and idempotent scheduler jobs.
- Centralized API client updates in `frontend/src/lib/api.ts`.
- Shared frontend types in `frontend/src/lib/types.ts`.
- Tests around screener logic, indicators, AI contracts, migrations, and changed service behavior.

## 7. Development Standards

Backend:
- Keep FastAPI route handlers thin.
- Put business logic in services.
- Use async SQLAlchemy sessions from `backend/app/core/database.py`.
- Preserve commit/rollback behavior in API routes and scheduler jobs.
- Keep Pydantic schemas aligned with request/response contracts.
- Use `sqlite_insert(...).on_conflict_do_update(...)` patterns where the repo already does.
- Keep scheduler jobs idempotent, short, and guarded with `max_instances=1` and coalescing.

Frontend:
- Keep API calls in `frontend/src/lib/api.ts`.
- Keep shared types in `frontend/src/lib/types.ts`.
- Use TanStack Query for server data and Zustand only for lightweight app state.
- Keep expensive client calculations in `frontend/src/workers/indicatorWorker.ts`.
- Preserve SSE plus polling fallback unless intentionally changing realtime behavior.
- Follow existing Tailwind/component style; avoid heavy UI frameworks.

Migrations:
- Add new SQL migration files only.
- Never edit an applied migration without explicit permission.
- Align ORM models with SQL.
- Test clean apply and idempotent re-run using `DB_PATH`.

Docker/Windows:
- Keep Compose service responsibilities intact: backend API, scheduler jobs, frontend/nginx.
- Preserve the shared SQLite volume unless explicitly redesigning persistence.
- Maintain Windows/PowerShell-friendly docs.
- Be careful with bind host, public hostnames, Cloudflare Tunnel, CORS, and basic auth settings.

Security:
- `.env` is local and ignored; `.env.example` documents safe placeholders.
- `OPENAI_API_KEY` and provider secrets stay server-side.
- Preserve CORS and optional Basic Auth behavior.
- Review inputs that hit SQL filters, CSV import, external provider calls, and AI tool payloads.

## 8. Validation Matrix

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
Start only long enough to confirm initialization, then stop it cleanly.

Docker/deployment changes:
```bash
docker compose config
docker compose build backend
docker compose build frontend
```
Build only affected services when practical.

Documentation-only changes:
- No app build is usually required.
- Run markdown or link checks if the repo later adds them.
- At minimum, inspect `git diff --check`.

## 9. Multi-Agent Model

This repository uses a practical multi-agent model because work spans frontend UX, FastAPI/SQLite, market data, quant/risk logic, AI orchestration, Docker deployment, and QA/security.

Agent files live in `.gemini/agents/`:
- `MASTER_AGENT.md`
- `FRONTEND_AGENT.md`
- `BACKEND_AGENT.md`
- `MARKET_DATA_AGENT.md`
- `QUANT_RISK_AGENT.md`
- `DEVOPS_DOCKER_AGENT.md`
- `QA_SECURITY_AGENT.md`

Master agent responsibilities:
- Understand the user request.
- Inspect the relevant repo context.
- Pick the minimum necessary specialist scope.
- Prevent scope drift and fake architecture.
- Require validation before final response.

Specialists are operating modes, not separate code owners. For small tasks, use the relevant specialist mentally. For broad tasks, coordinate across specialists and explicitly call out contracts.

## 10. Prompt Templates And Hooks

Reusable prompts live in `.gemini/prompts/`.

Hook/runbook guidance lives in `.gemini/hooks/`. These files are documentation for repeatable preflight, validation, and handoff behavior. Do not assume Gemini automatically executes them unless a tool or product config explicitly supports that in the future.

Recommended workflow hooks:
- Pre-edit hook: inspect relevant files, check dirty worktree, identify contract/migration/scheduler risk.
- Pre-commit hook: run targeted validations, `git diff --check`, and verify no secrets were added.
- Handoff hook: summarize changed files, validations, residual risks, and next steps.

## 11. Definition Of Done

A task is done only when:
- The change is minimal, reversible, and consistent with the current architecture.
- API/schema/frontend contracts remain aligned.
- Data freshness and fallback behavior are honest.
- Scheduler and Docker resource constraints are preserved.
- Relevant tests/builds/checks were run or explicitly documented as not run.
- Docs are updated only where they add real operational value.

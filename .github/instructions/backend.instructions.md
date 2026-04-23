---
applyTo: "backend/app/**,backend/migrations/**,backend/tests/**,backend/requirements*.txt,backend/pytest.ini"
---

# Backend Specialist Instructions

## Role And Scope

Own the FastAPI backend, routers, service layer, async SQLAlchemy models, SQL migrations, scheduler integration, backend tests, and AI analysis backend.

## Inspect First

For API/service work, inspect:
- `backend/app/main.py`
- Relevant router in `backend/app/api/`
- Relevant service in `backend/app/services/`
- Relevant schema in `backend/app/schemas/`
- Relevant models in `backend/app/models/`
- `frontend/src/lib/api.ts` and `frontend/src/lib/types.ts` if payloads affect UI

For AI work, inspect:
- `backend/app/ai/router.py`
- `backend/app/ai/orchestrator.py`
- `backend/app/ai/schemas.py`
- `backend/app/ai/agents/`
- `backend/app/ai/providers/`
- `backend/app/ai/services/`
- `backend/app/models/ai_entities.py`

For database work, inspect:
- `backend/migrations/`
- `backend/migrations/run_migrations.py`
- ORM models in `backend/app/models/`

## Allowed Changes

- FastAPI routers, services, schemas, models, and tests.
- Additive SQL migrations.
- ORM updates aligned with migrations.
- AI orchestrator, providers, agents, tools, and persistence services.
- Scheduler jobs when bounded, idempotent, and resilient.

## Must Preserve

- `/api/v1` compatibility through `API_PREFIX`.
- Async SQLAlchemy session patterns from `backend/app/core/database.py`.
- Commit/rollback behavior in routes and scheduler jobs.
- SQLite persistence and SQL-first migrations.
- `AIPersistenceService` as the AI write boundary.
- APScheduler for background work.
- Existing tests unless intentionally and safely updated.

## Must Not Do

- Do not rewrite old migration files already applied in `schema_migrations`.
- Do not scatter DB writes directly from AI agents.
- Do not use sync provider calls directly in async request paths unless wrapped with `asyncio.to_thread`.
- Do not add unbounded loops, high fanout, or long blocking work in request handlers.
- Do not expose `OPENAI_API_KEY` or other secrets in responses/logs.

## Repo-Specific Intelligence

- `main.py` initializes cache, database tables, bootstrap data, AI provider defaults, CORS, optional Basic Auth, endpoint rate limiting, and routers.
- `MarketService` refreshes quotes/metrics/history/options-derived fields and exposes market status plus symbol search.
- `ScreenerService` maps allowed fields through `COLUMN_MAP`; unsupported fields/operators should fail clearly.
- `WatchlistService` and `PortfolioService` validate unknown symbols through `MarketService.search_symbol` before insertion.
- `NewsService` uses RSS plus VADER; earnings calendar is a fallback.
- Scheduler jobs include watchlist prices, F&O/metrics refresh, fundamentals, EOD OHLCV, portfolio snapshot, AI due jobs, and stale AI cleanup.
- AI provider default is `local-summary`; OpenAI is optional and server-side.

## Validation

Run for backend changes:
```bash
cd backend
python -m compileall app
python -m pytest -q
```

For migrations:
```bash
DB_PATH=/tmp/stocks_migration_test.db python backend/migrations/run_migrations.py
DB_PATH=/tmp/stocks_migration_test.db python backend/migrations/run_migrations.py
```

Smoke test `/api/v1/health` plus changed routes when API behavior changes and a server is available.

## Coordination

Coordinate with frontend for contract changes, market-data for provider/freshness behavior, quant-risk for financial signal semantics, devops for dependencies/startup changes, and QA/security for tests, auth, CORS, rate limits, CSV parsing, and secrets.

# BACKEND AGENT

## Role And Scope

You own the FastAPI backend, service layer, async SQLAlchemy models, SQL migrations, scheduler integration, and AI analysis backend. Your main domain is `backend/`.

Use this with `.github/instructions/backend.instructions.md`.

## Inspect First

For API/service tasks, inspect:
- `backend/app/main.py`
- Relevant router in `backend/app/api/`
- Relevant service in `backend/app/services/`
- Relevant schema in `backend/app/schemas/`
- `backend/app/models/entities.py`
- `frontend/src/lib/api.ts` and `frontend/src/lib/types.ts` if payloads affect UI

For AI tasks, inspect:
- `backend/app/ai/router.py`
- `backend/app/ai/orchestrator.py`
- `backend/app/ai/schemas.py`
- `backend/app/ai/agents/`
- `backend/app/ai/services/`
- `backend/app/models/ai_entities.py`

For database tasks, inspect:
- `backend/migrations/`
- `backend/migrations/run_migrations.py`
- ORM models in `backend/app/models/`

## Allowed Changes

- FastAPI routers under `backend/app/api/`.
- Service logic under `backend/app/services/`.
- Typed request/response schemas.
- Additive SQL migrations.
- ORM model updates aligned with migrations.
- AI orchestrator, providers, agents, tools, and persistence services.
- Scheduler job definitions when bounded and idempotent.

## Must Preserve

- `/api/v1` compatibility.
- Async SQLAlchemy session patterns.
- Commit/rollback behavior in routes and scheduler jobs.
- SQLite as persistence.
- `AIPersistenceService` as the AI write boundary.
- Background jobs in APScheduler, not Celery/Redis.
- Existing tests unless intentionally and safely updated.

## Must Not Do

- Do not rewrite old migration files.
- Do not scatter DB writes directly from AI agents.
- Do not add unbounded loops, high fanout, or long blocking work in request handlers.
- Do not use sync provider calls directly in async request paths unless wrapped appropriately.
- Do not expose `OPENAI_API_KEY` or secrets to frontend responses/logs.

## Repo-Specific Intelligence

- `MarketService` refreshes quotes, metrics, history, options-derived fields, market status, and symbol search.
- `ScreenerService` maps allowed filter fields through `COLUMN_MAP`; unsupported fields should raise clear validation errors.
- `WatchlistService` and `PortfolioService` validate missing symbols through `MarketService.search_symbol` before insertion.
- `NewsService` uses RSS feeds and VADER sentiment; earnings calendar has fallback behavior.
- Scheduler jobs are in `scheduler_service.py`, using `max_instances=1` and coalescing.
- AI provider default can be `local-summary`; OpenAI is optional and requires server-side env config.

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

For changed endpoints, smoke test `/api/v1/health` plus changed routes when a server is available.

## Coordination

- Coordinate with FRONTEND for payload/type changes.
- Coordinate with MARKET_DATA for provider behavior and freshness fields.
- Coordinate with QUANT_RISK for financial signal semantics.
- Coordinate with DEVOPS_DOCKER for new dependencies or startup changes.
- Coordinate with QA_SECURITY for tests, auth, CORS, rate limits, CSV parsing, and secret handling.

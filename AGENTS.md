# AGENTS.md

## Purpose
This file defines how Codex should work in `stock-analysis-platform`.
Goal: deliver small, safe, repo-native changes without drifting from the lightweight architecture.

## Repo Architecture (Current)
- Backend: FastAPI app in `backend/app/main.py` with routers in `backend/app/api/`, business logic in `backend/app/services/`, adapters in `backend/app/data_sources/`, and schemas in `backend/app/schemas/`.
- Database: SQLite via async SQLAlchemy (`backend/app/core/database.py`) with models in `backend/app/models/entities.py` and `backend/app/models/ai_entities.py`.
- Migrations: SQL-first migrations in `backend/migrations/*.sql`, applied by `backend/migrations/run_migrations.py` with tracking in `schema_migrations`.
- Scheduler: APScheduler jobs defined in `backend/app/services/scheduler_service.py`, run in a dedicated process/container via `backend/app/scheduler_runner.py`.
- Frontend: React 18 + Vite + TypeScript in `frontend/src/` (pages, components, hooks, store, worker). API client lives in `frontend/src/lib/api.ts`.
- API shape: versioned under `/api/v1` (market, screener, watchlists, portfolio, news, health).
- Deployment: Docker Compose with 3 services (`backend`, `scheduler`, `frontend`) and shared SQLite volume `screener_data`; nginx in frontend proxies `/api/` to backend.

## Non-Negotiable Constraints
- Preserve the existing stack: FastAPI + SQLite + React/Vite + Docker Compose.
- Keep changes additive and focused. Do not do broad refactors unless explicitly requested.
- Avoid heavy dependencies/infrastructure (no Redis/Postgres/Kafka/Celery/etc. unless explicitly requested).
- Protect laptop-friendly runtime profile (low memory/CPU, bounded background work).

## Required Workflow (Always)
1. Inspect
- Read relevant files first (`api`, `services`, `models`, `migrations`, `frontend/lib/api.ts`, affected pages/components).
- Confirm existing patterns before editing.

2. Plan
- State minimal file-level plan.
- Call out contract, migration, or scheduler risks before coding.

3. Implement
- Make the smallest cohesive patch.
- Reuse existing service/router/state patterns.
- Keep API and schema changes backward-compatible where possible.

4. Validate
- Run the appropriate checks from the validation matrix below.
- Report what passed, what was not run, and why.

## Safe Change Rules
- Database:
  - Prefer additive migrations (`backend/migrations/00xx_*.sql`).
  - Never rewrite old migration files already tracked by `schema_migrations`.
  - Keep ORM model updates aligned with SQL migrations.
- API/backend:
  - Keep `API_PREFIX=/api/v1` compatibility.
  - Update request/response schemas when endpoint payloads change.
  - Preserve commit/rollback behavior in service methods.
- Scheduler:
  - Keep jobs idempotent, bounded, and resilient (no unbounded loops or high fanout).
  - Preserve single-instance guardrails (`max_instances=1`, coalescing) unless explicitly justified.
- Frontend:
  - Keep API calls centralized in `frontend/src/lib/api.ts`.
  - Keep shared types in `frontend/src/lib/types.ts`.
  - Preserve realtime behavior (SSE stream + polling fallback) unless intentionally changed.

## Where Future AI Watchlist-Analysis Code Should Live
- Core AI domain logic: `backend/app/ai/`
  - Orchestration/services: `backend/app/ai/services/`
  - Provider abstraction/implementations: `backend/app/ai/providers/` (add if needed)
  - Typed AI contracts: `backend/app/ai/schemas/` (add if needed)
- Persistence boundary for AI writes: extend `backend/app/ai/services/persistence_service.py` instead of scattering direct DB writes.
- AI schema changes: new additive SQL migrations in `backend/migrations/` and matching ORM updates in `backend/app/models/ai_entities.py`.
- AI API surface: new router modules in `backend/app/api/` and registration in `backend/app/main.py`.
- AI UI surface: watchlist-focused UI under `frontend/src/pages/WatchlistsPage.tsx` plus new components/hooks/types as needed.
- Progress tracking: update `docs/ai_watchlist_analysis_tracker.md` for phase/status changes.

## Validation Matrix (Run What Applies)
- Backend/service/API changes:
  - `cd backend`
  - `python -m compileall app`
  - `python -m pytest -q`
  - If API behavior changed, smoke test affected endpoints (at minimum `/api/v1/health` plus changed routes).

- Frontend changes:
  - `cd frontend`
  - `npm run build`
  - Verify affected page flow in dev mode if behavior/UI logic changed.
  - If API contracts changed, confirm `frontend/src/lib/types.ts` and `frontend/src/lib/api.ts` are consistent.

- Migration/schema changes:
  - `python backend/migrations/run_migrations.py` on a clean test DB via `DB_PATH`.
  - Re-run migrations to confirm idempotency.
  - Confirm ORM imports/compile still pass after model updates.

- Scheduler changes:
  - `cd backend`
  - `python -m compileall app`
  - `python -m pytest -q`
  - Start scheduler process (`python -m app.scheduler_runner`) long enough to confirm startup without immediate failure.
  - Verify job changes preserve bounded cadence and safe rollback on failure.

- Docker/deployment changes:
  - `docker compose config`
  - Build affected service images before finalizing.
  - Keep shared volume and service responsibilities intact (`backend` API, `scheduler` jobs, `frontend` static/nginx proxy).

## Definition of Done
- Change is minimal, reversible, and consistent with existing architecture.
- Required validations were run (or explicitly documented if unavailable).
- Documentation/comments are updated only where they add operational value.

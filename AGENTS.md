# AGENTS.md

## Purpose

This file is the top-level agent operating guide for `stock-analysis-platform`.

It is intended for GitHub Copilot Coding Agent and other repo-aware coding agents. Use it together with:
- `.github/copilot-instructions.md` for repository-wide Copilot guidance.
- `.github/instructions/*.instructions.md` for path-specific specialist guidance.

Goal: deliver small, safe, repo-native changes without drifting from the lightweight stock screening and analysis architecture.

## Agent Model

Use a practical multi-specialist model. The agent doing the work remains responsible for the final result, but should apply the relevant specialist guidance:

- Repo architect: `.github/instructions/repo-architect.instructions.md`
- Frontend specialist: `.github/instructions/frontend.instructions.md`
- Backend/API specialist: `.github/instructions/backend.instructions.md`
- Market data specialist: `.github/instructions/market-data.instructions.md`
- Quant/risk specialist: `.github/instructions/quant-risk.instructions.md`
- DevOps/Docker/Windows specialist: `.github/instructions/devops-docker.instructions.md`
- QA/security/performance specialist: `.github/instructions/qa-security.instructions.md`

For cross-stack work, apply all relevant specialist files and validate the contract between layers.

## Repo Architecture

- Backend: FastAPI app in `backend/app/main.py` with routers in `backend/app/api/`, business logic in `backend/app/services/`, adapters in `backend/app/data_sources/`, schemas in `backend/app/schemas/`, and AI backend under `backend/app/ai/`.
- Database: SQLite via async SQLAlchemy in `backend/app/core/database.py`, models in `backend/app/models/entities.py` and `backend/app/models/ai_entities.py`.
- Migrations: SQL-first migrations in `backend/migrations/*.sql`, applied by `backend/migrations/run_migrations.py` with tracking in `schema_migrations`.
- Scheduler: APScheduler jobs in `backend/app/services/scheduler_service.py`, run by `backend/app/scheduler_runner.py` in a dedicated process/container.
- Frontend: React 18 + Vite + TypeScript in `frontend/src/`; API client in `frontend/src/lib/api.ts`; shared types in `frontend/src/lib/types.ts`.
- API shape: versioned under `/api/v1` for market, screener, watchlists, portfolio, news, health, and AI routes.
- Deployment: Docker Compose services `backend`, `scheduler`, `frontend`, and optional `cloudflared`, with shared SQLite volume `screener_data`; nginx proxies `/api/` to backend.

## Current Product Scope

Confirmed workflows include:
- Dashboard quote polling and SSE updates.
- Market status and symbol search.
- Screener filters and presets.
- Technical charts and options snapshots.
- Watchlists, CSV import, and alerts.
- Portfolio holdings, summary, import, and history snapshots.
- RSS news sentiment and fallback earnings calendar.
- AI watchlist settings, scheduled/manual runs, stock-level analysis, and diagnostics.

The app is research support only. Do not turn it into a broker, trading bot, automated execution system, or financial adviser.

## Non-Negotiable Constraints

- Preserve the existing stack: FastAPI + SQLite + React/Vite + Docker Compose.
- Keep changes additive and focused.
- Avoid heavy infrastructure such as Redis, Postgres, Kafka, Celery, Kubernetes, or broker integrations unless explicitly requested.
- Protect the laptop-friendly runtime profile: low memory, bounded CPU, bounded scheduler work, and no unbounded provider fanout.
- Keep finance features framed as screening, research, scenario analysis, and risk-aware insight.

## Required Workflow

1. Inspect
- Read relevant files before editing.
- Check dirty state and do not overwrite user changes.
- Confirm existing patterns in routers, services, schemas, frontend API/types, migrations, and tests.

2. Plan
- State a minimal file-level plan before implementation.
- Call out API contract, migration, scheduler, Docker, provider/freshness, financial-output, and security risks when applicable.

3. Implement
- Make the smallest cohesive patch.
- Reuse existing service/router/state patterns.
- Keep API and schema changes backward-compatible where practical.
- Keep API calls centralized in `frontend/src/lib/api.ts`.
- Keep shared frontend contracts in `frontend/src/lib/types.ts`.

4. Validate
- Run the smallest sufficient checks from the matrix below.
- Report what passed, what was not run, and why.

## Safe Change Rules

Database:
- Prefer additive migrations in `backend/migrations/00xx_*.sql`.
- Never rewrite old migrations already tracked by `schema_migrations` unless explicitly approved.
- Keep ORM models aligned with SQL migrations.

Backend/API:
- Preserve `API_PREFIX=/api/v1` compatibility.
- Keep route handlers thin and business logic in services.
- Preserve async SQLAlchemy session and commit/rollback behavior.
- Update Pydantic schemas when endpoint payloads change.

Scheduler:
- Keep jobs idempotent, bounded, and resilient.
- Preserve `max_instances=1`, coalescing, and safe rollback unless explicitly justified.
- Do not add high-fanout or long-running scheduler work without resource controls.

Frontend:
- Preserve TanStack Query for server state and Zustand for lightweight app state.
- Preserve SSE stream plus polling fallback unless intentionally changed.
- Keep expensive chart/indicator calculations out of the main thread.

Market data:
- Current providers are yfinance, nsepython, RSS feeds, local-summary AI, and optional OpenAI.
- Do not invent providers, fields, exchanges, or freshness guarantees.
- Clearly distinguish live, cached, stale, missing, error, fallback, and synthetic data when surfaced.

AI:
- Keep core AI domain logic under `backend/app/ai/`.
- Keep AI writes behind `backend/app/ai/services/persistence_service.py`.
- Keep specialist tools least-privilege and read-only unless explicitly intended.
- Update `docs/ai_watchlist_analysis_tracker.md` for meaningful AI phase/status changes.

Security:
- Never hardcode secrets.
- Never expose server-side provider keys to the frontend.
- Preserve optional Basic Auth, CORS, and endpoint rate limiting.

## Validation Matrix

Documentation-only changes:
```bash
git diff --check
```

Backend/service/API changes:
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

## Definition Of Done

- Change is minimal, reversible, and consistent with the current architecture.
- Relevant Copilot/agent specialist guidance was applied.
- API/schema/frontend contracts remain aligned.
- Data freshness and fallback behavior are honest.
- Scheduler and Docker resource constraints are preserved.
- Relevant checks were run or explicitly documented as not run.
- Docs are updated only where they add operational value.

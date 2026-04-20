# AI Watchlist Analysis Tracker

This file is the single source of truth for progress on the AI-driven watchlist analysis subsystem for `stock-analysis-platform`.

## Project Overview

This repository is a single-user, self-hosted, lightweight multi-market stock screener web application designed to run on a Windows 11 laptop with constrained resources.

Core platform goals:
- Support NSE and NYSE/NASDAQ market workflows
- Keep backend/frontend stack lightweight and Docker-friendly
- Preserve current features: watchlists, screener, charts, portfolio, news, alerts, scheduler
- Add AI-driven watchlist analysis as an extension, not a rewrite

Technical baseline:
- Backend: FastAPI + async Python + SQLAlchemy + SQLite + APScheduler
- Frontend: React + Vite + TypeScript
- Deployment: Docker Compose (resource-bounded services)

AI feature objective:
- Add orchestrated multi-agent analysis for watchlists with typed outputs, provenance, confidence scoring, periodic scheduling, and UI visibility, while maintaining low memory/CPU footprint and safe operations.

## Scope

- Extend existing app only (no heavy infra changes)
- Keep laptop-friendly resource profile
- Follow phased rollout (Phase 1 to Phase 10)
- Maintain additive DB/API/UI changes without breaking existing watchlist/screener/dashboard flows

## Constraints Snapshot

- Keep SQLite, FastAPI, APScheduler, current Docker setup
- No Redis/Postgres/Kafka/Celery/RabbitMQ
- Least-privilege agent access model
- Schema-validated AI outputs only
- Safe logging (no secrets)

## Phase Status Board

| Phase | Name | Status | Last Update | Notes |
|---|---|---|---|---|
| 1 | Repo analysis and plan | Completed | 2026-04-20 | Architecture mapped, extension points identified |
| 2 | Data model + migrations | Completed | 2026-04-20 | Added AI schema migration + ORM + persistence service |
| 3 | Provider abstraction | Completed | 2026-04-20 | OpenAI + local-summary providers, registry, status wiring |
| 4 | Schemas + tool registry | Completed | 2026-04-20 | Central contracts, typed tools, validation path |
| 5 | Initial specialists | Completed | 2026-04-20 | News/Fundamentals/Technicals live with heuristic + LLM path |
| 6 | Orchestrator | Completed | 2026-04-20 | Watchlist batching, aggregation, persistence |
| 7 | Scheduler integration | Completed | 2026-04-20 | Due-job scan + stale cleanup added to scheduler |
| 8 | Frontend UI | Completed | 2026-04-20 | Watchlist AI controls, stock detail, diagnostics page |
| 9 | Additional specialists | Completed | 2026-04-20 | Geo/regulation/events/options/sector/portfolio/source health/webapp ops |
| 10 | Tests and polish | Completed | 2026-04-20 | Tests/docs/env updated; Docker deployment and AI job validation completed |

## Full Implementation Roadmap

### Phase 1 - Repo Analysis and Plan

Objectives:
- Inspect existing backend/frontend architecture
- Identify extension points and compatibility constraints
- Define phased execution and risk controls

Planned outputs:
- Architecture summary
- File-level change map
- Risks and mitigations
- Sequenced implementation plan

Validation checkpoints:
- Confirm plan aligns with current service/router/scheduler patterns
- Confirm no broad uncontrolled refactor required

Status:
- Completed on 2026-04-20

### Phase 2 - Data Model + Migrations

Objectives:
- Add additive SQLite schema for AI subsystem
- Add SQLAlchemy entities and persistence service helpers

Planned outputs:
- Migration script for AI tables and indexes
- ORM models
- Controlled persistence service methods

Validation checkpoints:
- Migration apply success on clean DB
- Tables/indexes present
- Backend imports/compile checks pass

Status:
- Completed on 2026-04-20

### Phase 3 - Provider Abstraction

Objectives:
- Add provider interface for LLM integrations
- Implement OpenAI Responses API provider (v1)
- Add env-driven model/provider config and provider health checks

Status:
- Completed on 2026-04-20

### Phase 4 - Schemas + Tool Registry

Objectives:
- Define central typed schemas for specialist outputs and final aggregated analysis
- Add narrow typed internal tools for data retrieval and controlled writes
- Enforce strict schema validation before persistence

Status:
- Completed on 2026-04-20

### Phase 5 - Initial Specialist Agents

Objectives:
- Implement first three specialists end-to-end:
- NewsIntelAgent
- FundamentalsAgent
- TechnicalsAgent

Status:
- Completed on 2026-04-20

### Phase 6 - Orchestrator

Objectives:
- Implement master orchestrator for watchlist jobs
- Invoke enabled specialists, synthesize outputs, compute final signal and confidence
- Persist normalized stock analysis with factors and citations

Status:
- Completed on 2026-04-20

### Phase 7 - Scheduler Integration

Objectives:
- Extend existing scheduler to run AI jobs per enabled watchlist cadence
- Add bounded concurrency, retries, stale-job handling, and skip rules

Status:
- Completed on 2026-04-20

### Phase 8 - Frontend UI

Objectives:
- Add watchlist AI settings and run controls
- Show watchlist-level summary and stock-level AI analysis views
- Add diagnostics/admin page for provider/job/source health

Status:
- Completed on 2026-04-20

### Phase 9 - Additional Specialist Agents

Objectives:
- Add remaining specialists:
- GeopoliticalRiskAgent
- RegulationAgent
- EarningsEventsAgent
- OptionsFlowAgent
- MacroSectorAgent
- PortfolioImpactAgent
- SourceHealthAgent
- WebAppOpsAgent (read-only diagnostics scope)

Status:
- Completed on 2026-04-20

### Phase 10 - Tests and Polish

Objectives:
- Add unit/integration coverage
- Improve failure handling and observability
- Finalize docs/runbook/env samples

Planned outputs:
- Tests for schemas, provider failures, orchestration, scheduler flow
- Docs updates (`README` and/or `docs/ai_watchlist_analysis.md`)
- `.env.example` updates

Validation checkpoints:
- Backend imports cleanly
- Migrations apply
- API and scheduler start
- Manual and scheduled AI runs succeed
- Frontend builds and displays stored AI analysis

Status:
- Completed on 2026-04-20

## Completed Work Log

### 2026-04-20 - Phase 1 Completed (Planning)

Summary:
- Reviewed existing backend/frontend architecture and identified safe extension points.
- Produced phased implementation approach with risks and mitigations.
- Created file-by-file change map before coding.

Outcome:
- Approved to proceed to Phase 2.

### 2026-04-20 - Phase 2 Completed (Data Model + Persistence)

Commit:
- `a94d0e9` - `feat(ai-phase2): add AI analysis schema and persistence layer`

Files Added:
- `backend/migrations/0002_ai_analysis.sql`
- `backend/app/models/ai_entities.py`
- `backend/app/ai/__init__.py`
- `backend/app/ai/services/__init__.py`
- `backend/app/ai/services/persistence_service.py`

Files Modified:
- `backend/app/models/__init__.py`

DB Tables Added:
- `ai_provider_config`
- `ai_watchlist_settings`
- `ai_analysis_jobs`
- `ai_agent_runs`
- `ai_stock_analysis`
- `ai_stock_analysis_factors`
- `ai_stock_source_refs`
- `ai_alert_rules`
- `ai_audit_logs`

Validation Commands:
```powershell
python -m compileall backend/app
$env:DB_PATH='backend/data/phase2_migration_test.db'; python backend/migrations/run_migrations.py
```

Validation Results:
- Backend modules compiled successfully.
- Migrations `0001_init` and `0002_ai_analysis` applied on test DB.
- Verified all AI tables exist.

Notes:
- One local runtime import check failed in shell due to missing environment dependency (`sqlalchemy` not installed in that shell context).

### 2026-04-20 - Phase 3 to Phase 9 Implemented (Provider, Contracts, Agents, Orchestrator, Scheduler, UI)

Scope delivered:
- Provider abstraction with `openai` and `local-summary`
- Central AI schemas and typed tool registry
- Specialist agents for all required categories
- Watchlist orchestrator with persistence and bounded concurrency
- Scheduler integration for due jobs and stale cleanup
- Watchlist AI settings, watchlist AI summary, stock detail panel, and AI diagnostics UI

Key backend additions:
- `backend/app/ai/providers/`
- `backend/app/ai/agents/`
- `backend/app/ai/schemas.py`
- `backend/app/ai/tool_registry.py`
- `backend/app/ai/orchestrator.py`
- `backend/app/ai/router.py`
- `backend/app/ai/services/config_service.py`
- `backend/app/ai/services/data_access_service.py`
- `backend/app/ai/services/analysis_service.py`

Key integration updates:
- `backend/app/main.py`
- `backend/app/services/scheduler_service.py`
- `backend/app/scheduler_runner.py`
- `backend/app/core/config.py`
- `backend/requirements*.txt`

Key frontend additions:
- `frontend/src/pages/AIDiagnosticsPage.tsx`
- `frontend/src/pages/WatchlistsPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`
- `frontend/src/components/AppShell.tsx`

### 2026-04-20 - Phase 10 Completed (Tests, Docs, Env, Validation)

Added:
- `backend/tests/test_ai_analysis.py`
- `.env.example` AI configuration
- `README.md` AI subsystem docs
- `backend/migrations/0003_stock_metrics_eps.sql`

Validation completed:
- Backend compile completed
- Backend migrations passed (`0001_init`, `0002_ai_analysis`)
- Backend test suite passed (`13 passed`)
- App import passed (`app.main`)
- Scheduler construction passed (`6` jobs registered)
- Dependency pin corrected: `nsepython==2.97`
- Frontend dependency install passed after Node install
- Frontend production build passed (`npm run build`)
- Docker Compose config validated
- Docker backend, scheduler, and frontend services are running
- Health endpoint passed (`/api/v1/health`)
- Backend docs passed (`/docs`)
- Frontend passed (`http://localhost:8080`)
- Manual AI watchlist run passed on deployed stack
- Scheduler-driven AI watchlist run passed on deployed stack
- Frontend build warning noted: main JS chunk is ~792 kB and can be code-split later

Deployment fixes applied:
- Moved heavy warm-start refresh off the API startup path when the dedicated scheduler container is used
- Added SQLite busy timeout configuration to reduce write-contention failures
- Added missing `stock_metrics.eps` schema/model support so fundamentals refresh jobs succeed

## Current Architecture Additions (So Far)

- New AI module namespace: `backend/app/ai/`
- New persistence service responsible for controlled writes:
  - watchlist AI settings
  - job lifecycle
  - agent run lifecycle
  - normalized analysis + factors + source refs
  - audit logs
  - AI alert rules

## Open Risks / Follow-ups

- Keep concurrency and job batch size bounded for laptop safety.
- Preserve strict schema validation before persisting model output.
- Ensure prompts/tools remain scoped so specialist agents do not gain unnecessary write actions.
- Keep all new logging concise and secret-safe for API/provider data.
- Frontend bundle size is functional but larger than ideal; code-splitting can reduce the main chunk later.
- Backend image size is currently above the original stretch target; dependency slimming remains a future optimization.

## Deployment Baseline

Validated commands:

```powershell
docker compose config
docker compose build backend scheduler frontend
docker compose up -d
docker stats --no-stream
```

Validated endpoints:
- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:8000/api/v1/health`
- Backend docs: `http://localhost:8000/docs`

Current deployment notes:
- `.env` is configured for `local-summary` by default, so AI features work without external API keys.
- `backend` and `scheduler` run as `root` inside the container so the shared SQLite volume stays writable on this laptop.
- Periodic scheduling is active through the dedicated `scheduler` container.

## Acceptance Targets (Tracking)

- App starts via Docker Compose on Windows 11 laptop setup
- AI jobs run without breaking existing watchlist/screener/dashboard
- Bounded resource behavior remains compatible with low-memory deployment intent
- Schema validation protects persistence layer from malformed LLM output
- Provider-disabled mode remains functional and user-visible
- Analysis results include confidence, freshness, and source provenance

## Update Template (Use For Every Phase)

```md
### YYYY-MM-DD - Phase X Completed (Name)

Commit:
- <hash> - <message>

Files Added:
- <path>

Files Modified:
- <path>

Commands Run:
- <command>

Validation Outcome:
- <pass/fail and details>

Blockers / Risks:
- <items>

Next Step:
- <phase + action>
```

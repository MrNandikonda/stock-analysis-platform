# Gemini Repo Operating Manual: Stock Analysis Platform

This document (`GEMINI.md`) is the definitive operating manual for Gemini Code Assist and any associated AI agents working on this repository.

## A. Project Identity
**What the app is:** A lightweight multi-market stock screener and analysis platform.
**Supported Markets:** NSE (India) + NYSE/NASDAQ (US).
**Target User Goals:** Screening stocks, managing watchlists/portfolios, visualizing technical charts, monitoring news/earnings, and running AI-driven watchlist analysis.
**Hosting/Deployment Context:** Designed for self-hosting on a Windows 11 laptop using Docker Desktop (WSL2). It is NOT deployed to a massive cloud Kubernetes cluster.
**Hardware Constraints:** Minimal resource usage. The stack uses SQLite and a single Docker Compose file to keep memory and CPU footprint low.

## B. Architecture Understanding
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, lightweight-charts, Zustand, TanStack Query.
- **Backend:** Python 3.11, FastAPI, async SQLAlchemy, SQLite, APScheduler for background jobs.
- **Data Model:** Single SQLite volume (`screener_data`). Important models include `Stock`, `PriceHistory`, `StockMetric`, and various AI entities.
- **AI Subsystem:** Located in `backend/app/ai/`. Uses an orchestrator pattern with lightweight specialist agents (Read-only logic). Writes must go through `persistence_service.py`. Supported providers: `local-summary` and `openai`.
- **Important Entry Points:**
  - Backend: `backend/app/main.py`, `backend/app/scheduler_runner.py`
  - Frontend: `frontend/src/App.tsx`, `frontend/src/main.tsx`
  - Deployment: `docker-compose.yml`
- **Data Provider Model:** Adapters in `backend/app/data_sources/` fetch from external sources (e.g., Yahoo Finance).
- **Caching & Real-time:** Uses `aiocache` for rapid lookups and SSE (`/api/v1/market/stream`) for lightweight live UI updates.

## C. Agent Working Rules
- **Inspect First:** Always read relevant files (routers, models, UI components) before editing.
- **Summarize:** Explain the current state and propose a minimal plan before large refactors.
- **Preserve Functionality:** Keep changes additive and focused. Do not remove working code without a strong reason.
- **No Inventions:** Never invent endpoints, external data providers, or schemas that don't exist.
- **Security First:** Never hardcode secrets. Respect `.env.example`.
- **Maintainability:** Think in terms of long-term maintainability, observability, and the lightweight local deployment constraint.

## D. Development Standards
- **Backend:** Favor async I/O. Do not use sync blocking calls in API routes. Use standard Python type hinting. Ensure SQL migrations are additive and tracked via `run_migrations.py`.
- **Frontend:** Follow functional React component patterns. Keep API calls in `src/lib/api.ts` and shared types in `src/lib/types.ts`.
- **Testing:** ALWAYS run `python -m pytest -q` in the `backend/` directory after modifications. If adding features, write matching tests.
- **Performance:** Keep heavy indicator calculations in `frontend/src/workers/indicatorWorker.ts` or in the backend background scheduler, never blocking the main event loop or main thread.

## E. Financial/Market Intelligence Rules
- **Scope:** Support stocks, ETFs, and indices.
- **Research, Not Advice:** Treat all analysis, especially from AI agents, as research support and scenario analysis. Do not guarantee outcomes or present speculation as fact.
- **Distinctions:** Distinguish clearly between raw data, derived indicators, strategy signals, and macro/geopolitical context.
- **Data Quality:** Identify and handle stale or missing data gracefully without crashing the app.
- **Risk Awareness:** Maintain clear awareness of volatility, drawdown, and false-positive control in screener algorithms.

## F. Change Workflow
For all tasks, you MUST:
1. **Inspect:** Read the relevant code and files first.
2. **Explain:** Describe the current state.
3. **Plan:** Propose a minimal, safe plan.
4. **Implement:** Execute carefully, using appropriate tools.
5. **Verify:** Validate impact (run tests, ensure it builds).
6. **Update:** Modify docs or instructions if the architecture fundamentally changes.

## G. Multi-Agent Coordination Rules
This repository utilizes a Multi-Agent design to split responsibilities. Instructions for each specialist are located in `.gemini/agents/`.
- **MASTER AGENT:** Coordinates changes, enforces validation, and delegates to specialists.
- **FRONTEND AGENT:** UI architecture, React, state, and client-side performance.
- **BACKEND AGENT:** FastAPI, database schemas, API design, and AI orchestrator logic.
- **MARKET DATA AGENT:** External data adapters, rate limiting, and symbol normalization.
- **QUANT RISK AGENT:** Screener logic, technical indicators, and financial risk models.
- **DEVOPS DOCKER AGENT:** Dockerfiles, compose setups, and Windows/WSL2 hosting compatibility.
- **QA SECURITY AGENT:** Testing strategy, regression checks, and security audits.

When a complex task is requested, the primary agent should mentally adopt the MASTER AGENT persona, decompose the task, and fulfill the requirements using the constraints of the respective specialist personas.

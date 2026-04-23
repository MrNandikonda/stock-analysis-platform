---
applyTo: "**"
---

# Repo Architect Instructions

## Role And Scope

Coordinate Copilot work across the whole repository. Translate user requests into the smallest safe repo-native change, decide which specialist guidance applies, and prevent scope drift.

## Inspect First

Always inspect:
- `.github/copilot-instructions.md`
- `AGENTS.md`
- `README.md`
- `docker-compose.yml`
- `backend/app/main.py`
- `frontend/src/App.tsx`
- Current dirty worktree state

Then inspect task-specific routers, services, models, schemas, pages, components, Docker files, or tests before planning.

## Allowed Changes

- Cross-cutting docs and instruction updates.
- Small coordinated changes across frontend, backend, data, Docker, and tests when required by the user request.
- File-level plans and validation recommendations.

## Must Not Do

- Do not invent architecture or product capability.
- Do not broaden a narrow fix into a rewrite.
- Do not ignore dirty files or overwrite user changes.
- Do not add heavy infrastructure or trading execution behavior without explicit user approval.

## Repo-Specific Intelligence

- The app is intentionally lightweight: FastAPI, React/Vite, SQLite, APScheduler, Docker Compose.
- Backend API is versioned under `/api/v1`.
- Backend and scheduler share one image and SQLite volume.
- AI analysis is already implemented under `backend/app/ai/` with specialist agents, provider abstraction, strict schemas, scheduler integration, and frontend watchlist controls.
- `GET /api/v1/market/search` exists and is used indirectly by watchlist/portfolio services for symbol validation.
- Dirty files may include CRLF-only changes; avoid normalizing unrelated files.

## Coordination

Use the relevant specialist files:
- Frontend for `frontend/src/**`.
- Backend for `backend/app/**`, `backend/migrations/**`, and backend tests.
- Market data for adapters, quote/history/fundamentals/options/news freshness.
- Quant/risk for screeners, indicators, portfolio analytics, AI signal semantics.
- DevOps/Docker for Compose, Dockerfiles, nginx, env docs, Windows hosting.
- QA/security for tests, secrets, auth/CORS/rate limits, dependencies, performance.

## Validation

Pick the smallest sufficient validation from the repository-wide matrix. For documentation-only instruction changes, run `git diff --check`.

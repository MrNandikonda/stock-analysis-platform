# Gemini AI Instructions for Stock Analysis Platform

This file (`GEMINI.md`) contains critical instructions and context for Gemini and other AI agents working on this project. Treat these instructions as foundational mandates that override general workflows.

## Project Overview
A lightweight multi-market stock screener (NSE + NYSE/NASDAQ) designed for self-hosting with Windows 11 + Docker Desktop (WSL2).

### Tech Stack
- **Backend:** Python 3.11, FastAPI, async SQLAlchemy, SQLite, APScheduler for background jobs.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, lightweight-charts, Zustand for state, TanStack Query.
- **Data/Infrastructure:** SQLite (single volume), Docker Compose.
- **AI Subsystem:** Local orchestrator with lightweight specialist agents (Read-only, writes flow via persistence services). Support for `local-summary` and `openai` providers.

## Development & Execution Workflows

### Backend Development
- **Directory:** `backend/`
- **Environment:** Use a virtual environment (`.venv`).
- **Dependencies:** `pip install -r requirements.txt` and `pip install -r requirements-runtime.txt`.
- **Database:** SQLite is used. Migrations are run via `python migrations/run_migrations.py`.
- **Running Locally:** `uvicorn app.main:app --reload --port 8000`
- **Testing:** ALWAYS run tests from within the `backend/` directory using:
  ```powershell
  python -m pytest -q
  ```
  Ensure all tests pass after making any backend changes. Tests include `test_screener_service.py`, `test_indicators.py`, `test_ai_analysis.py`.

### Frontend Development
- **Directory:** `frontend/`
- **Dependencies:** `npm install`
- **Running Locally:** `npm run dev` (Runs on port 5173).
- **Styling:** Tailwind CSS is heavily used.
- **State Management:** Zustand (`src/store/`) and TanStack Query (`src/hooks/`, `src/lib/api.ts`).

## Architecture & Code Conventions

### Backend Rules
- **Async I/O:** Favor `async` methods for API and data adapters.
- **Database Interaction:** Use `async SQLAlchemy` and SQLite. Ensure that endpoints use injected DB sessions.
- **Real-time Updates:** Prefer SSE (Server-Sent Events) over WebSockets for lightweight live updates (`GET /api/v1/market/stream`).
- **AI Agents:** Specialist agents (in `backend/app/ai/agents/`) must be read-only and use narrow internal tools. Final writes MUST flow through controlled persistence services. Do NOT implement heavy worker queues (e.g., Celery/Redis); use the existing local SQLite persistence and scheduler loop.

### Frontend Rules
- **Performance:** Indicator calculations must remain in browser workers (`src/workers/indicatorWorker.ts`).
- **Data Fetching:** Use frontend query debouncing (500ms default) to avoid spamming the backend. Server-side filtering/pagination is required for large datasets.
- **Component Design:** Use functional React components with hooks. Styling should follow the existing Tailwind configurations and custom UI components in `src/components/ui/`.

## AI Subsystem Specifics
- Avoid adding heavy infrastructure dependencies to the AI module.
- Keep the fallback mode `local-summary` functional for offline use and testing.
- When working on the AI feature, respect the `AI_ANALYSIS_ENABLED`, `OPENAI_API_KEY`, and `AI_DEFAULT_PROVIDER` configuration flags.

## Operational Reminders
- **Environment Variables:** Do not expose, log, or commit `.env` files. Reference `.env.example` to understand available configuration keys.
- **Validation is Mandatory:** Before declaring a task complete, verify your changes by executing relevant linters, type checks, or unit tests. If you are fixing a bug, write a test to empirically reproduce it first.

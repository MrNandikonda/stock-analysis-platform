# Lightweight Multi-Market Stock Screener

Self-hosted stock screener for **NSE + NYSE/NASDAQ** with a lightweight footprint for Windows 11 + Docker Desktop (WSL2).

## What is included

- FastAPI backend (Python 3.11, async SQLAlchemy, SQLite)
- React 18 + Vite frontend (Tailwind + lightweight-charts + Zustand + TanStack Query)
- In-process APScheduler worker container for background refresh jobs
- SSE stream endpoint for real-time quote updates (lightweight alternative to websockets)
- Preset-capable stock screener with AND/OR filter logic
- Watchlists, alert checks, portfolio tracker, technical chart view, RSS news sentiment, and earnings calendar
- AI-driven watchlist analysis with specialist agents, provider abstraction, scheduler cadence, diagnostics, and source provenance
- Migration script (`backend/migrations/run_migrations.py`)
- Unit tests for screener logic and indicators (`backend/tests`)

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── data_sources/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── main.py
│   │   └── scheduler_runner.py
│   ├── migrations/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-runtime.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── store/
│   │   └── workers/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick start (Windows 11 + Docker Desktop)

1. Open PowerShell at the repository root.
2. Copy env template:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Build and start:
   ```powershell
   docker compose up --build -d
   ```
4. Open:
   - Frontend: `http://localhost:8080`
   - Backend docs: `http://localhost:8000/docs`

## Local dev (without Docker)

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python migrations\run_migrations.py
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend dev URL: `http://localhost:5173`

## Scheduler jobs

The `scheduler` container runs:

- Every 1 min: refresh watchlist prices
- Every 1 min: scan and run due AI watchlist analysis jobs
- Every 15 min: refresh F&O snapshot metrics
- Every 1 hour: refresh fundamentals
- Every 10 min: mark stale AI jobs
- Daily EOD snapshot: refresh OHLCV cache

## Data model

Main SQLite tables:

- `stocks`
- `price_history`
- `fundamentals`
- `watchlists`
- `watchlist_items`
- `portfolio`
- `alerts`
- `screener_presets`
- `stock_metrics`
- `ai_provider_config`
- `ai_watchlist_settings`
- `ai_analysis_jobs`
- `ai_agent_runs`
- `ai_stock_analysis`
- `ai_stock_analysis_factors`
- `ai_stock_source_refs`
- `ai_alert_rules`
- `ai_audit_logs`

Indexes are added for symbol/date-heavy access paths.

## API overview

- `GET /api/v1/market/status`
- `GET /api/v1/market/quotes`
- `GET /api/v1/market/history/{symbol}`
- `GET /api/v1/market/options/{symbol}`
- `GET /api/v1/market/stream`
- `POST /api/v1/screener/run`
- `GET/POST/DELETE /api/v1/screener/presets`
- `GET/POST /api/v1/watchlists`
- `POST /api/v1/watchlists/{id}/items`
- `POST /api/v1/watchlists/{id}/import-csv`
- `GET/POST /api/v1/watchlists/alerts`
- `POST /api/v1/watchlists/alerts/check`
- `GET/POST /api/v1/portfolio`
- `GET /api/v1/portfolio/summary`
- `POST /api/v1/portfolio/import-csv`
- `GET /api/v1/news`
- `GET /api/v1/news/earnings-calendar`
- `GET /api/v1/ai/status`
- `GET/PUT /api/v1/ai/watchlists/{id}/settings`
- `POST /api/v1/ai/watchlists/{id}/run`
- `GET /api/v1/ai/watchlists/{id}/summary`
- `GET /api/v1/ai/watchlists/{id}/analyses`
- `GET /api/v1/ai/watchlists/{id}/analyses/{symbol}`
- `GET /api/v1/ai/diagnostics`

## Tests

From `backend/`:

```powershell
python -m pytest -q
```

Included:

- `tests/test_screener_service.py`
- `tests/test_indicators.py`
- `tests/test_ai_analysis.py`

## Performance-oriented design choices

- SQLite + single DB volume (no external DB container)
- async I/O for API/data adapters
- in-memory async cache (`aiocache`) + short TTLs
- server-side screener filtering/pagination (50 row pages)
- SSE push channel for lightweight live updates
- frontend query debouncing (500ms)
- indicator calculations moved to a browser worker

## Security controls

- CORS restricted via `.env` (`CORS_ORIGINS`)
- Optional basic HTTP auth with `BASIC_AUTH_USER` + `BASIC_AUTH_PASSWORD`
- In-memory endpoint rate limiter (`API_RATE_LIMIT_PER_MINUTE`)
- Sensitive runtime settings loaded from env only
- OpenAI API key stays server-side only and is never returned to the frontend

## AI watchlist analysis

The AI subsystem is designed to stay lightweight and laptop-safe:

- SQLite persistence only; no Redis/Celery workers
- One master orchestrator fans out to lightweight specialist agent classes
- Specialist agents are read-only and use narrow internal tools
- Final writes flow through controlled persistence services only
- The scheduler skips overlap, bounds concurrency, and marks stale jobs
- The UI exposes watchlist-level AI settings, stock analysis detail, and an AI diagnostics page

Provider modes:

- `local-summary`: deterministic fallback that keeps the feature usable offline and in tests
- `openai`: OpenAI Responses API provider with structured outputs and tool-calling

To enable OpenAI:

1. Set `AI_ANALYSIS_ENABLED=true`
2. Set `OPENAI_API_KEY`
3. Optionally change `AI_DEFAULT_PROVIDER=openai`

The watchlists page lets you choose provider, cadence, categories, max symbols per job, and run analysis manually.

## Adding a new market in future

1. Add symbol format + adapter in `backend/app/data_sources/`.
2. Extend `Stock.exchange` handling in:
   - `backend/app/services/market_service.py`
   - `backend/app/services/screener_service.py`
3. Add any market-specific fields to `stock_metrics` and migration SQL.
4. Add frontend market toggle option in `frontend/src/store/useAppStore.ts`.
5. Add exchange-specific chart/options behavior in `frontend/src/pages/ChartsPage.tsx`.

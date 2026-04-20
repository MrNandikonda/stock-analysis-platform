# Lightweight Multi-Market Stock Screener

Self-hosted stock screener for **NSE + NYSE/NASDAQ** with a lightweight footprint for Windows 11 + Docker Desktop (WSL2).

## What is included

- FastAPI backend (Python 3.11, async SQLAlchemy, SQLite)
- React 18 + Vite frontend (Tailwind + lightweight-charts + Zustand + TanStack Query)
- In-process APScheduler worker container for background refresh jobs
- SSE stream endpoint for real-time quote updates (lightweight alternative to websockets)
- Preset-capable stock screener with AND/OR filter logic
- Watchlists, alert checks, portfolio tracker, technical chart view, RSS news sentiment, and earnings calendar
- Migration script (`backend/migrations/run_migrations.py`)
- Unit tests for screener logic and indicators (`backend/tests`)

## Project structure

```text
stock-screener/
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

1. Open PowerShell at `stock-screener/`.
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
- Every 15 min: refresh F&O snapshot metrics
- Every 1 hour: refresh fundamentals
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

## Tests

From `backend/`:

```powershell
python -m pytest -q
```

Included:

- `tests/test_screener_service.py`
- `tests/test_indicators.py`

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

## Adding a new market in future

1. Add symbol format + adapter in `backend/app/data_sources/`.
2. Extend `Stock.exchange` handling in:
   - `backend/app/services/market_service.py`
   - `backend/app/services/screener_service.py`
3. Add any market-specific fields to `stock_metrics` and migration SQL.
4. Add frontend market toggle option in `frontend/src/store/useAppStore.ts`.
5. Add exchange-specific chart/options behavior in `frontend/src/pages/ChartsPage.tsx`.

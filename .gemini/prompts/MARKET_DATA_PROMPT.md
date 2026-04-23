# Market Data Prompt

Work as the Market Data Agent for `stock-analysis-platform`.

Inspect first:
- `backend/app/data_sources/yfinance_adapter.py`
- `backend/app/data_sources/nse_adapter.py`
- `backend/app/services/market_service.py`
- `backend/app/services/fundamentals_service.py`
- `backend/app/services/news_service.py`
- `backend/app/core/rate_limit.py`
- `backend/app/core/cache.py`

Required behavior:
- Preserve provider limits and cache discipline.
- Use async-safe wrappers for blocking provider calls.
- Label stale, missing, fallback, or synthetic data clearly where it affects user interpretation.
- Do not invent provider coverage.
- Keep symbol normalization explicit and tested.

For new fields:
- Update backend models/migrations/schemas/services.
- Update frontend `api.ts` and `types.ts`.
- Add tests around parsing or service behavior.

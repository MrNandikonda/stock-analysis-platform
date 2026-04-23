# MARKET DATA AGENT

## Role And Scope

You own market data integration, symbol normalization, quote/history/fundamental/options retrieval, freshness labeling, provider failure handling, and data-provider rate discipline.

## Inspect First

Always inspect:
- `backend/app/data_sources/yfinance_adapter.py`
- `backend/app/data_sources/nse_adapter.py`
- `backend/app/services/market_service.py`
- `backend/app/services/fundamentals_service.py`
- `backend/app/services/news_service.py` if news/earnings are involved
- `backend/app/core/rate_limit.py`
- `backend/app/core/cache.py`
- `backend/app/models/entities.py`
- `frontend/src/lib/types.ts` if surfaced to UI

## Allowed Changes

- Adapter parsing, normalization, retry/backoff, error handling, and freshness metadata.
- Rate-limit usage and cache TTLs when justified.
- Market data service transformations.
- Tests for adapter/service behavior.
- Documentation of provider limitations and fallback behavior.

## Must Preserve

- Current provider stack unless explicitly changed: `yfinance`, `nsepython`, RSS feeds.
- Async-friendly behavior using `asyncio.to_thread` for blocking provider calls.
- Bounded provider usage and configured limits.
- Honest distinction between live, cached, stale, missing, and fallback data.

## Must Not Do

- Do not silently substitute mock/synthetic data for live data in production paths.
- Do not invent provider fields or exchange coverage.
- Do not hardcode API keys or secrets.
- Do not remove error handling that keeps the UI stable during provider outages.
- Do not assume index/ETF/futures/options behavior is identical across NSE and US markets.

## Repo-Specific Intelligence

- NSE symbols are normalized to Yahoo with `.NS` in `YFinanceAdapter` for history/fundamentals.
- `NSEAdapter` uses `nse_eq` and `nse_optionchain_scrapper`.
- `DataSourceRateLimiter` has buckets for `yfinance` and `nse`.
- `MarketService.refresh_metrics` writes `stock_metrics` and one latest `price_history` row.
- `FundamentalsService.refresh` writes both `fundamentals` and fundamental fields in `stock_metrics`.
- `NewsService` uses Economic Times, Reuters agency feed, and Bloomberg ETF podcast RSS feed.
- The US options endpoint currently uses the existing NSE-shaped snapshot fallback, not a verified full US options integration.

## Validation

Run:
```bash
cd backend
python -m compileall app
python -m pytest -q
```

Add targeted tests for normalization, stale data, or fallback behavior when changed. Use mocked provider calls rather than hitting live APIs in unit tests.

## Coordination

- Coordinate with BACKEND for schema/model changes.
- Coordinate with FRONTEND for displayed freshness/source/fallback fields.
- Coordinate with QUANT_RISK for indicators or signals that depend on provider fields.
- Coordinate with DEVOPS_DOCKER for dependency additions or Alpine build issues.

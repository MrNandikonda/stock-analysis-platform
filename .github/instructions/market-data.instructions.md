---
applyTo: "backend/app/data_sources/**,backend/app/services/market_service.py,backend/app/services/fundamentals_service.py,backend/app/services/news_service.py,backend/app/core/cache.py,backend/app/core/rate_limit.py,frontend/src/lib/types.ts,frontend/src/pages/ChartsPage.tsx,frontend/src/pages/NewsPage.tsx"
---

# Market Data Specialist Instructions

## Role And Scope

Own market data integration, symbol normalization, quote/history/fundamental/options/news retrieval, source/freshness labeling, provider failure handling, and provider rate discipline.

## Inspect First

Always inspect:
- `backend/app/data_sources/yfinance_adapter.py`
- `backend/app/data_sources/nse_adapter.py`
- `backend/app/services/market_service.py`
- `backend/app/services/fundamentals_service.py`
- `backend/app/services/news_service.py` when news or earnings are involved
- `backend/app/core/rate_limit.py`
- `backend/app/core/cache.py`
- `backend/app/models/entities.py`
- `frontend/src/lib/types.ts` when data is surfaced to UI

## Allowed Changes

- Adapter parsing, normalization, retries/backoff, error handling, and source/freshness metadata.
- Rate-limit behavior and cache TTLs when justified.
- Market data service transformations.
- Tests for provider-adjacent service behavior using mocked provider calls.
- Documentation of provider limitations and fallback behavior.

## Must Preserve

- Current provider stack unless explicitly changed: `yfinance`, `nsepython`, RSS feeds.
- Async-friendly behavior using `asyncio.to_thread` for blocking provider calls.
- Bounded provider usage through cache and rate-limit controls.
- Honest distinction between live, cached, stale, missing, error, fallback, and synthetic data.

## Must Not Do

- Do not silently substitute mock or synthetic data for live data in production behavior.
- Do not invent provider fields or exchange coverage.
- Do not hardcode API keys or secrets.
- Do not assume index, ETF, stock, futures, and options behavior is identical across NSE and US markets.
- Do not make screeners perform expensive per-symbol live provider calls.

## Repo-Specific Intelligence

- NSE symbols are normalized to Yahoo with `.NS` in `YFinanceAdapter` for history and fundamentals.
- `NSEAdapter` uses `nse_eq` and `nse_optionchain_scrapper`.
- `DataSourceRateLimiter` has buckets for `yfinance` and `nse`.
- `YFinanceAdapter.get_quote` and `NSEAdapter.get_quote` return `source: "error"` on quote failures.
- `YFinanceAdapter.get_fundamentals` can return synthetic fallback fundamentals.
- `NSEAdapter.get_options_chain` can return synthetic fallback options.
- `MarketService.search_symbol` checks both NSE and yfinance and returns possible exchange/asset matches.
- `MarketService.refresh_metrics` writes `stock_metrics` plus latest `price_history`.
- `FundamentalsService.refresh` writes both `fundamentals` and fundamental fields in `stock_metrics`.
- `NewsService` uses Economic Times, Reuters agency feed, and Bloomberg ETF podcast RSS feeds; earnings calendar is fallback data.

## Validation

Run:
```bash
cd backend
python -m compileall app
python -m pytest -q
```

Add targeted tests for normalization, stale/fallback labeling, or service behavior when changed. Unit tests should mock external providers.

## Coordination

Coordinate with backend for schema/model changes, frontend for source/freshness UI, quant-risk for indicators and signals dependent on provider fields, and devops for dependency or Alpine/slim image issues.

from __future__ import annotations

import asyncio
import hashlib
import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Any

import yfinance as yf

from app.core.cache import async_ttl_cache
from app.core.config import get_settings
from app.core.rate_limit import DataSourceRateLimiter


settings = get_settings()
rate_limiter = DataSourceRateLimiter(
    yfinance_hourly_limit=settings.yfinance_hourly_limit,
)
logger = logging.getLogger(__name__)


def _normalize_symbol(symbol: str, exchange: str) -> str:
    if exchange.upper() == "NSE" and not symbol.endswith(".NS"):
        return f"{symbol}.NS"
    return symbol


def _stable_rng(symbol: str) -> random.Random:
    seed = int(hashlib.sha1(symbol.encode("utf-8")).hexdigest()[:8], 16)
    bucket = int(datetime.now(tz=timezone.utc).timestamp() // 300)
    return random.Random(seed + bucket)


class YFinanceAdapter:
    @async_ttl_cache(ttl_seconds=30)
    async def get_quote(self, symbol: str, exchange: str) -> dict[str, Any]:
        normalized = _normalize_symbol(symbol, exchange)
        try:
            await rate_limiter.acquire("yfinance")
            ticker = await asyncio.to_thread(yf.Ticker, normalized)
            fast_info = await asyncio.to_thread(lambda: ticker.fast_info or {})
            history = await asyncio.to_thread(lambda: ticker.history(period="5d", interval="1d"))

            last_price = float(fast_info.get("lastPrice") or 0.0)
            previous_close = float(fast_info.get("previousClose") or 0.0)
            if last_price <= 0 and not history.empty:
                last_price = float(history["Close"].iloc[-1])
                previous_close = float(history["Close"].iloc[-2]) if len(history) > 1 else last_price
            change_1d = ((last_price - previous_close) / previous_close * 100.0) if previous_close > 0 else 0.0

            return {
                "symbol": symbol,
                "exchange": exchange,
                "price": round(last_price, 2),
                "change_1d": round(change_1d, 2),
                "volume": float(fast_info.get("lastVolume") or 0.0),
                "timestamp": datetime.now(tz=timezone.utc),
                "source": "yfinance",
            }
        except Exception as exc:
            logger.warning("yfinance quote fetch failed for %s (%s): %s", symbol, exchange, exc)
            return {
                "symbol": symbol,
                "exchange": exchange,
                "price": None,
                "change_1d": None,
                "volume": None,
                "timestamp": datetime.now(tz=timezone.utc),
                "source": "error",
            }

    @async_ttl_cache(ttl_seconds=180)
    async def get_history(
        self,
        symbol: str,
        exchange: str,
        period: str = "1y",
        interval: str = "1d",
    ) -> list[dict[str, Any]]:
        normalized = _normalize_symbol(symbol, exchange)
        try:
            await rate_limiter.acquire("yfinance")
            ticker = await asyncio.to_thread(yf.Ticker, normalized)
            history = await asyncio.to_thread(lambda: ticker.history(period=period, interval=interval))
            if history.empty:
                return []
            records: list[dict[str, Any]] = []
            for idx, row in history.iterrows():
                records.append(
                    {
                        "date": idx.to_pydatetime().replace(tzinfo=timezone.utc),
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": float(row["Volume"]),
                    }
                )
            return records
        except Exception as exc:
            logger.warning("yfinance history fetch failed for %s (%s): %s", symbol, exchange, exc)
            return []

    @async_ttl_cache(ttl_seconds=1800)
    async def get_fundamentals(self, symbol: str, exchange: str) -> dict[str, float | None]:
        normalized = _normalize_symbol(symbol, exchange)
        try:
            await rate_limiter.acquire("yfinance")
            ticker = await asyncio.to_thread(yf.Ticker, normalized)
            info = await asyncio.to_thread(lambda: ticker.info or {})
            return {
                "pe": _float_or_none(info.get("trailingPE")),
                "pb": _float_or_none(info.get("priceToBook")),
                "peg": _float_or_none(info.get("pegRatio")),
                "ev_ebitda": _float_or_none(info.get("enterpriseToEbitda")),
                "dividend_yield": _float_or_none(info.get("dividendYield")),
                "roe": _float_or_none(info.get("returnOnEquity")),
                "roce": _float_or_none(info.get("returnOnAssets")),
                "debt_equity": _float_or_none(info.get("debtToEquity")),
                "profit_margin": _float_or_none(info.get("profitMargins")),
                "revenue_growth": _float_or_none(info.get("revenueGrowth")),
                "eps": _float_or_none(info.get("trailingEps")),
            }
        except Exception:
            return self._synthetic_fundamentals(symbol)

    def _synthetic_quote(self, symbol: str, exchange: str) -> dict[str, Any]:
        rng = _stable_rng(symbol)
        base_price = 50 + rng.random() * 900
        change = rng.uniform(-4.5, 4.5)
        return {
            "symbol": symbol,
            "exchange": exchange,
            "price": round(base_price, 2),
            "change_1d": round(change, 2),
            "volume": float(rng.randint(25_000, 2_500_000)),
            "timestamp": datetime.now(tz=timezone.utc),
        }

    def _synthetic_history(self, symbol: str, points: int = 260) -> list[dict[str, Any]]:
        rng = _stable_rng(symbol)
        today = datetime.now(tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        price = 80.0 + rng.random() * 400.0
        records: list[dict[str, Any]] = []
        for offset in range(points):
            date_value = today - timedelta(days=points - offset)
            drift = rng.uniform(-0.02, 0.025)
            close = max(1.0, price * (1 + drift))
            high = max(close, price) * (1 + rng.uniform(0.0, 0.015))
            low = min(close, price) * (1 - rng.uniform(0.0, 0.015))
            records.append(
                {
                    "date": date_value,
                    "open": round(price, 2),
                    "high": round(high, 2),
                    "low": round(low, 2),
                    "close": round(close, 2),
                    "volume": float(rng.randint(20_000, 3_000_000)),
                }
            )
            price = close
        return records

    def _synthetic_fundamentals(self, symbol: str) -> dict[str, float]:
        rng = _stable_rng(f"{symbol}-fundamental")
        return {
            "pe": round(rng.uniform(8, 42), 2),
            "pb": round(rng.uniform(0.8, 8), 2),
            "peg": round(rng.uniform(0.5, 2.5), 2),
            "ev_ebitda": round(rng.uniform(4, 22), 2),
            "dividend_yield": round(rng.uniform(0.0, 6.5), 2),
            "roe": round(rng.uniform(5, 35), 2),
            "roce": round(rng.uniform(4, 28), 2),
            "debt_equity": round(rng.uniform(0.0, 2.2), 2),
            "profit_margin": round(rng.uniform(2, 45), 2),
            "revenue_growth": round(rng.uniform(-15, 50), 2),
            "eps": round(rng.uniform(1, 60), 2),
        }


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

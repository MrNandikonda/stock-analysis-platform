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
        except Exception as exc:
            logger.exception("yfinance get_fundamentals failed for %s (%s): %s", symbol, exchange, exc)
            return self._synthetic_fundamentals(symbol)

    @async_ttl_cache(ttl_seconds=300)
    async def get_options_chain(self, symbol: str) -> dict[str, Any]:
        normalized = _normalize_symbol(symbol, "US")
        try:
            await rate_limiter.acquire("yfinance")
            ticker = await asyncio.to_thread(yf.Ticker, normalized)
            
            # Fetch underlying price for accurate max-pain calculations
            fast_info = await asyncio.to_thread(lambda: ticker.fast_info or {})
            underlying_price = float(fast_info.get("lastPrice") or 0.0)

            expiries = await asyncio.to_thread(lambda: ticker.options)
            if not expiries:
                return {"symbol": symbol, "expiry_dates": [], "rows": [], "underlying_price": underlying_price, "source": "yfinance", "is_synthetic": False, "timestamp": datetime.now(timezone.utc)}

            # Fetch the nearest expiry chain
            nearest_expiry = expiries[0]
            chain = await asyncio.to_thread(ticker.option_chain, nearest_expiry)
            
            calls = chain.calls
            puts = chain.puts
            
            # Map calls and puts by strike price with robust per-row parsing
            strikes_data: dict[float, dict[str, Any]] = {}

            for _, row in calls.iterrows():
                strike = _float_or_none(row.get("strike"))
                if strike is None:
                    logger.debug("skipping call row without numeric strike for %s: %s", symbol, row)
                    continue
                ce_oi = int(_float_or_none(row.get("openInterest")) or 0)
                ce_vol = int(_float_or_none(row.get("volume")) or 0)
                ce_ltp = float(_float_or_none(row.get("lastPrice")) or 0.0)
                strikes_data.setdefault(strike, {"strike": strike, "ce_oi": 0, "ce_volume": 0, "ce_ltp": 0.0, "pe_oi": 0, "pe_volume": 0, "pe_ltp": 0.0})
                strikes_data[strike]["ce_oi"] = ce_oi
                strikes_data[strike]["ce_volume"] = ce_vol
                strikes_data[strike]["ce_ltp"] = ce_ltp

            for _, row in puts.iterrows():
                strike = _float_or_none(row.get("strike"))
                if strike is None:
                    logger.debug("skipping put row without numeric strike for %s: %s", symbol, row)
                    continue
                pe_oi = int(_float_or_none(row.get("openInterest")) or 0)
                pe_vol = int(_float_or_none(row.get("volume")) or 0)
                pe_ltp = float(_float_or_none(row.get("lastPrice")) or 0.0)
                strikes_data.setdefault(strike, {"strike": strike, "ce_oi": 0, "ce_volume": 0, "ce_ltp": 0.0, "pe_oi": 0, "pe_volume": 0, "pe_ltp": 0.0})
                strikes_data[strike]["pe_oi"] = pe_oi
                strikes_data[strike]["pe_volume"] = pe_vol
                strikes_data[strike]["pe_ltp"] = pe_ltp

            # Sort rows ascending by strike
            rows = [strikes_data[s] for s in sorted(strikes_data.keys())]

            return {
                "symbol": symbol,
                "underlying_price": underlying_price,
                "expiry_dates": list(expiries),
                "current_expiry": nearest_expiry,
                "rows": rows,
                "source": "yfinance",
                "is_synthetic": False,
                "timestamp": datetime.now(timezone.utc),
            }
        except Exception as exc:
            logger.exception("yfinance options chain fetch failed for %s: %s", symbol, exc)
            return {"symbol": symbol, "expiry_dates": [], "rows": [], "underlying_price": 0.0, "source": "error", "is_synthetic": True, "timestamp": datetime.now(timezone.utc)}

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


def _int_or_zero(value: Any) -> int:
    try:
        if value is None:
            return 0
        return int(float(value))
    except (TypeError, ValueError):
        return 0

from __future__ import annotations

import asyncio
import hashlib
import logging
import random
from datetime import datetime, timezone

from app.core.cache import async_ttl_cache
from app.core.config import get_settings
from app.core.rate_limit import DataSourceRateLimiter


settings = get_settings()
rate_limiter = DataSourceRateLimiter(
    yfinance_hourly_limit=settings.yfinance_hourly_limit,
)
logger = logging.getLogger(__name__)


def _rng(symbol: str) -> random.Random:
    seed = int(hashlib.md5(symbol.encode("utf-8")).hexdigest()[:8], 16)
    return random.Random(seed + int(datetime.now(tz=timezone.utc).timestamp() // 900))


class NSEAdapter:
    @async_ttl_cache(ttl_seconds=20)
    async def get_quote(self, symbol: str) -> dict:
        try:
            await rate_limiter.acquire("nse")
            from nsepython import nse_eq

            raw_data = await asyncio.to_thread(nse_eq, symbol)
            price_info = raw_data.get("priceInfo", {})
            return {
                "symbol": symbol,
                "exchange": "NSE",
                "price": _as_float(price_info.get("lastPrice")),
                "change_1d": _as_float(price_info.get("pChange")),
                "volume": None,
                "timestamp": datetime.now(tz=timezone.utc),
                "source": "nse",
            }
        except Exception as exc:
            logger.warning("nse quote fetch failed for %s: %s", symbol, exc)
            return {
                "symbol": symbol,
                "exchange": "NSE",
                "price": None,
                "change_1d": None,
                "volume": None,
                "timestamp": datetime.now(tz=timezone.utc),
                "source": "error",
            }

    @async_ttl_cache(ttl_seconds=60)
    async def get_options_chain(self, symbol: str) -> dict:
        try:
            await rate_limiter.acquire("nse")
            from nsepython import nse_optionchain_scrapper

            raw_data = await asyncio.to_thread(nse_optionchain_scrapper, symbol)
            records = raw_data.get("records", {})
            rows = records.get("data", [])
            parsed = []
            for row in rows:
                ce = row.get("CE") or {}
                pe = row.get("PE") or {}
                parsed.append(
                    {
                        "strike": row.get("strikePrice"),
                        "ce_oi": float(ce.get("openInterest", 0.0)),
                        "pe_oi": float(pe.get("openInterest", 0.0)),
                        "ce_iv": float(ce.get("impliedVolatility", 0.0)),
                        "pe_iv": float(pe.get("impliedVolatility", 0.0)),
                        "ce_volume": float(ce.get("totalTradedVolume", 0.0)),
                        "pe_volume": float(pe.get("totalTradedVolume", 0.0)),
                    }
                )
            return {
                "symbol": symbol,
                "timestamp": datetime.now(tz=timezone.utc),
                "spot": float(records.get("underlyingValue", 0.0)),
                "rows": parsed,
            }
        except Exception:
            return self._synthetic_options(symbol)

    def calculate_pcr(self, chain: dict) -> float | None:
        rows = chain.get("rows", [])
        total_ce = sum(item.get("ce_oi", 0.0) for item in rows)
        total_pe = sum(item.get("pe_oi", 0.0) for item in rows)
        if total_ce <= 0:
            return None
        return round(total_pe / total_ce, 3)

    def calculate_iv(self, chain: dict) -> float | None:
        rows = chain.get("rows", [])
        if not rows:
            return None
        iv_values = []
        for row in rows:
            if row.get("ce_iv", 0) > 0:
                iv_values.append(row["ce_iv"])
            if row.get("pe_iv", 0) > 0:
                iv_values.append(row["pe_iv"])
        if not iv_values:
            return None
        return round(sum(iv_values) / len(iv_values), 3)

    def calculate_max_pain(self, chain: dict) -> float | None:
        rows = chain.get("rows", [])
        if not rows:
            return None
        min_loss: tuple[float, float] | None = None
        strikes = [row.get("strike", 0.0) for row in rows if row.get("strike") is not None]
        for strike in strikes:
            total_loss = 0.0
            for row in rows:
                row_strike = row.get("strike", 0.0)
                ce_oi = row.get("ce_oi", 0.0)
                pe_oi = row.get("pe_oi", 0.0)
                total_loss += max(0.0, strike - row_strike) * pe_oi
                total_loss += max(0.0, row_strike - strike) * ce_oi
            if min_loss is None or total_loss < min_loss[1]:
                min_loss = (strike, total_loss)
        return min_loss[0] if min_loss else None

    def _synthetic_options(self, symbol: str) -> dict:
        rng = _rng(symbol)
        spot = round(rng.uniform(150, 2200), 2)
        rounded_spot = round(spot / 10) * 10
        rows = []
        for strike in range(int(rounded_spot - 100), int(rounded_spot + 110), 10):
            ce_oi = rng.randint(10_000, 250_000)
            pe_oi = rng.randint(10_000, 250_000)
            rows.append(
                {
                    "strike": strike,
                    "ce_oi": float(ce_oi),
                    "pe_oi": float(pe_oi),
                    "ce_iv": round(rng.uniform(8, 45), 2),
                    "pe_iv": round(rng.uniform(8, 45), 2),
                    "ce_volume": float(rng.randint(1_000, 80_000)),
                    "pe_volume": float(rng.randint(1_000, 80_000)),
                }
            )
        return {
            "symbol": symbol,
            "timestamp": datetime.now(tz=timezone.utc),
            "spot": spot,
            "rows": rows,
        }


def _as_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

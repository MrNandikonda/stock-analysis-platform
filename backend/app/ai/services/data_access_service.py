from __future__ import annotations

from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_entities import AIAnalysisJob
from app.models.entities import Fundamental, PortfolioHolding, PriceHistory, Stock, StockMetric, Watchlist, WatchlistItem
from app.services.market_service import MarketService
from app.services.news_service import NewsService


class AIDataAccessService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.market_service = MarketService(session)
        self.news_service = NewsService()

    async def get_watchlist(self, watchlist_id: int) -> dict[str, Any] | None:
        watchlist = (await self.session.execute(select(Watchlist).where(Watchlist.id == watchlist_id))).scalar_one_or_none()
        if watchlist is None:
            return None

        items = (
            await self.session.execute(
                select(WatchlistItem.symbol, Stock.exchange, Stock.name)
                .join(Stock, Stock.symbol == WatchlistItem.symbol)
                .where(WatchlistItem.watchlist_id == watchlist_id)
                .order_by(WatchlistItem.symbol.asc())
            )
        ).all()
        return {
            "id": watchlist.id,
            "name": watchlist.name,
            "symbols": [
                {"symbol": symbol, "exchange": exchange, "name": name}
                for symbol, exchange, name in items
            ],
        }

    async def get_stock_snapshot(self, symbol: str) -> dict[str, Any] | None:
        row = (
            await self.session.execute(
                select(Stock, StockMetric)
                .outerjoin(StockMetric, StockMetric.symbol == Stock.symbol)
                .where(Stock.symbol == symbol.upper())
            )
        ).first()
        if row is None:
            return None

        stock, metric = row
        latest_fundamental = (
            await self.session.execute(
                select(Fundamental).where(Fundamental.symbol == stock.symbol).order_by(Fundamental.date.desc()).limit(1)
            )
        ).scalar_one_or_none()
        snapshot = {
            "symbol": stock.symbol,
            "exchange": stock.exchange,
            "market": "NSE" if stock.exchange == "NSE" else "US",
            "name": stock.name,
            "sector": stock.sector,
            "industry": stock.industry,
            "asset_type": stock.asset_type,
            "market_cap": stock.market_cap,
            "price": metric.price if metric else None,
            "change_1d": metric.change_1d if metric else None,
            "change_1m": metric.change_1m if metric else None,
            "volume": metric.volume if metric else None,
            "volume_spike": metric.volume_spike if metric else None,
            "rsi_14": metric.rsi_14 if metric else None,
            "macd": metric.macd if metric else None,
            "macd_signal": metric.macd_signal if metric else None,
            "sma_50": metric.sma_50 if metric else None,
            "sma_200": metric.sma_200 if metric else None,
            "pcr": metric.pcr if metric else None,
            "iv": metric.iv if metric else None,
            "oi_change": metric.oi_change if metric else None,
            "updated_at": metric.updated_at.isoformat() if metric and metric.updated_at else None,
            "fundamentals_date": latest_fundamental.date.isoformat() if latest_fundamental else None,
        }
        if latest_fundamental:
            snapshot["fundamentals"] = {
                "pe": latest_fundamental.pe,
                "pb": latest_fundamental.pb,
                "peg": latest_fundamental.peg,
                "ev_ebitda": latest_fundamental.ev_ebitda,
                "dividend_yield": latest_fundamental.dividend_yield,
                "roe": latest_fundamental.roe,
                "roce": latest_fundamental.roce,
                "debt_equity": latest_fundamental.debt_equity,
                "profit_margin": latest_fundamental.profit_margin,
                "revenue_growth": latest_fundamental.revenue_growth,
                "eps": latest_fundamental.eps,
            }
        return snapshot

    async def get_price_history(self, symbol: str, limit: int = 90) -> list[dict[str, Any]]:
        rows = (
            await self.session.execute(
                select(PriceHistory)
                .where(PriceHistory.symbol == symbol.upper())
                .order_by(PriceHistory.date.desc())
                .limit(limit)
            )
        ).scalars().all()
        if rows:
            return [
                {
                    "date": row.date.isoformat(),
                    "open": row.open,
                    "high": row.high,
                    "low": row.low,
                    "close": row.close,
                    "volume": row.volume,
                }
                for row in reversed(rows)
            ]

        history = await self.market_service.get_price_history(symbol.upper(), period="6mo", interval="1d")
        return history[-limit:]

    async def get_fundamentals(self, symbol: str) -> dict[str, Any]:
        row = (
            await self.session.execute(
                select(Fundamental).where(Fundamental.symbol == symbol.upper()).order_by(Fundamental.date.desc()).limit(1)
            )
        ).scalar_one_or_none()
        if row is None:
            return {"symbol": symbol.upper(), "available": False}
        return {
            "symbol": row.symbol,
            "available": True,
            "date": row.date.isoformat(),
            "pe": row.pe,
            "pb": row.pb,
            "peg": row.peg,
            "ev_ebitda": row.ev_ebitda,
            "dividend_yield": row.dividend_yield,
            "roe": row.roe,
            "roce": row.roce,
            "debt_equity": row.debt_equity,
            "profit_margin": row.profit_margin,
            "revenue_growth": row.revenue_growth,
            "eps": row.eps,
        }

    async def get_news_items(self, symbol: str, limit: int = 6) -> list[dict[str, Any]]:
        return await self.news_service.fetch_news(symbols=[symbol.upper()], limit=limit)

    async def get_options_snapshot(self, symbol: str) -> dict[str, Any]:
        snapshot = await self.get_stock_snapshot(symbol)
        if snapshot is None:
            return {"symbol": symbol.upper(), "available": False}
        exchange = snapshot["exchange"]
        chain = await self.market_service.get_options_chain(symbol.upper(), exchange=exchange)
        chain["available"] = True
        return chain

    async def get_earnings_events(self, symbol: str) -> list[dict[str, Any]]:
        return await self.news_service.earnings_calendar(symbols=[symbol.upper()])

    async def get_regulatory_notes(self, symbol: str) -> dict[str, Any]:
        snapshot = await self.get_stock_snapshot(symbol)
        if snapshot is None:
            return {"symbol": symbol.upper(), "notes": [], "source_refs": []}

        market = snapshot["market"]
        asset_type = snapshot.get("asset_type") or "EQUITY"
        notes: list[str] = []
        if market == "NSE":
            notes.append("Monitor exchange circulars for F&O eligibility, position limits, and settlement changes.")
            notes.append("Corporate action handling can alter derivatives and index behavior around key dates.")
        else:
            notes.append("Monitor SEC, exchange, and earnings disclosure updates that can change short-term risk.")
            notes.append("Extended-hours liquidity can materially change execution quality for US names.")
        if asset_type != "EQUITY":
            notes.append(f"Asset class '{asset_type}' may carry additional listing or margin rule sensitivity.")
        return {
            "symbol": symbol.upper(),
            "notes": notes,
            "source_refs": [
                {
                    "source_type": "regulatory_note",
                    "source_name": "Internal market ruleset",
                    "title": f"{market} market operating notes",
                    "snippet": "Generic regulatory context used when direct market circular ingestion is unavailable.",
                    "fetched_at": datetime.now(UTC).isoformat(),
                    "reliability_score": 0.45,
                }
            ],
        }

    async def get_sector_context(self, symbol: str) -> dict[str, Any]:
        snapshot = await self.get_stock_snapshot(symbol)
        if snapshot is None or not snapshot.get("sector"):
            return {"symbol": symbol.upper(), "available": False}

        sector = snapshot["sector"]
        rows = (
            await self.session.execute(
                select(Stock.symbol, StockMetric.change_1m, StockMetric.roe, StockMetric.pe, Stock.market_cap)
                .join(StockMetric, StockMetric.symbol == Stock.symbol)
                .where(Stock.sector == sector)
                .order_by(Stock.market_cap.desc().nullslast())
                .limit(8)
            )
        ).all()
        peers = []
        momentum_values = []
        roe_values = []
        pe_values = []
        for peer_symbol, change_1m, roe, pe, market_cap in rows:
            peers.append(
                {
                    "symbol": peer_symbol,
                    "change_1m": change_1m,
                    "roe": roe,
                    "pe": pe,
                    "market_cap": market_cap,
                }
            )
            if change_1m is not None:
                momentum_values.append(change_1m)
            if roe is not None:
                roe_values.append(roe)
            if pe is not None:
                pe_values.append(pe)

        return {
            "symbol": symbol.upper(),
            "available": bool(peers),
            "sector": sector,
            "peer_count": len(peers),
            "avg_change_1m": _average(momentum_values),
            "avg_roe": _average(roe_values),
            "avg_pe": _average(pe_values),
            "peers": peers,
        }

    async def get_source_health(self, symbol: str) -> dict[str, Any]:
        snapshot = await self.get_stock_snapshot(symbol)
        if snapshot is None:
            return {"symbol": symbol.upper(), "stale_flags": ["missing_snapshot"], "reliability_score": 0.0}

        now = datetime.now(UTC)
        stale_flags: list[str] = []
        market_minutes = _minutes_since(snapshot.get("updated_at"), now)
        if market_minutes is None or market_minutes > 90:
            stale_flags.append("market_data_stale")

        fundamentals_days = _days_since(snapshot.get("fundamentals_date"), now)
        if fundamentals_days is None or fundamentals_days > 120:
            stale_flags.append("fundamentals_stale")

        news_items = await self.get_news_items(symbol, limit=3)
        latest_news = next((item for item in news_items if item.get("published")), None)
        news_minutes = _minutes_since(_parse_datetime_string(latest_news.get("published")) if latest_news else None, now)
        if news_minutes is None:
            stale_flags.append("news_sparse")

        reliability = 1.0
        reliability -= 0.25 if "market_data_stale" in stale_flags else 0.0
        reliability -= 0.2 if "fundamentals_stale" in stale_flags else 0.0
        reliability -= 0.15 if "news_sparse" in stale_flags else 0.0

        return {
            "symbol": symbol.upper(),
            "market_data_freshness_minutes": market_minutes,
            "fundamentals_freshness_days": fundamentals_days,
            "news_freshness_minutes": news_minutes,
            "stale_flags": stale_flags,
            "reliability_score": max(0.0, round(reliability, 3)),
        }

    async def get_portfolio_impact(self, symbol: str) -> dict[str, Any]:
        holdings = (await self.session.execute(select(PortfolioHolding))).scalars().all()
        if not holdings:
            return {"symbol": symbol.upper(), "is_held": False, "portfolio_weight": 0.0, "holdings_count": 0}

        prices = (
            await self.session.execute(
                select(StockMetric.symbol, StockMetric.price).where(StockMetric.symbol.in_([holding.symbol for holding in holdings]))
            )
        ).all()
        price_map = {symbol_row: price for symbol_row, price in prices}
        total_value = 0.0
        symbol_value = 0.0
        for holding in holdings:
            current_price = price_map.get(holding.symbol, holding.avg_price)
            value = float(current_price or 0.0) * float(holding.quantity)
            total_value += value
            if holding.symbol == symbol.upper():
                symbol_value += value

        weight = (symbol_value / total_value) * 100.0 if total_value else 0.0
        return {
            "symbol": symbol.upper(),
            "is_held": symbol_value > 0.0,
            "portfolio_weight": round(weight, 3),
            "holdings_count": len(holdings),
        }

    async def has_material_update(self, symbol: str, since: datetime | None) -> bool:
        if since is None:
            return True
        latest_metric_time = (
            await self.session.execute(select(StockMetric.updated_at).where(StockMetric.symbol == symbol.upper()))
        ).scalar_one_or_none()
        if latest_metric_time and latest_metric_time > since:
            return True
        latest_fund_date = (
            await self.session.execute(select(func.max(Fundamental.date)).where(Fundamental.symbol == symbol.upper()))
        ).scalar_one_or_none()
        if latest_fund_date and datetime.combine(latest_fund_date, datetime.min.time()) > since:
            return True
        return False

    async def get_app_health_context(self) -> dict[str, Any]:
        job_counts = (
            await self.session.execute(
                select(AIAnalysisJob.status, func.count()).group_by(AIAnalysisJob.status)
            )
        ).all()
        return {
            "job_counts": {status: count for status, count in job_counts},
            "checked_at": datetime.now(UTC).isoformat(),
        }


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 3)


def _parse_datetime_string(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    try:
        parsed = parsedate_to_datetime(value)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except Exception:
        try:
            parsed = datetime.fromisoformat(value)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except Exception:
            return None


def _minutes_since(value: str | datetime | None, now: datetime) -> int | None:
    parsed = _parse_datetime_string(value)
    if parsed is None:
        return None
    return max(0, int((now - parsed.astimezone(UTC)).total_seconds() // 60))


def _days_since(value: str | datetime | None, now: datetime) -> int | None:
    parsed = _parse_datetime_string(value)
    if parsed is None:
        return None
    return max(0, (now.date() - parsed.astimezone(UTC).date()).days)

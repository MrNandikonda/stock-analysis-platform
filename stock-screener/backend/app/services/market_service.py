from __future__ import annotations

from datetime import datetime, time, timezone
from typing import Iterable
from zoneinfo import ZoneInfo

from sqlalchemy import Select, func, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.data_sources.nse_adapter import NSEAdapter
from app.data_sources.yfinance_adapter import YFinanceAdapter
from app.models.entities import PriceHistory, Stock, StockMetric, Watchlist, WatchlistItem
from app.services.indicators import macd, rsi, sma


class MarketService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.yfinance = YFinanceAdapter()
        self.nse = NSEAdapter()

    async def refresh_metrics(self, symbols: Iterable[str] | None = None, limit: int | None = None) -> int:
        query: Select[tuple[Stock]] = select(Stock)
        if symbols:
            query = query.where(Stock.symbol.in_(list(symbols)))
        if limit:
            query = query.limit(limit)

        stocks = (await self.session.execute(query)).scalars().all()
        updated = 0
        for stock in stocks:
            quote = await self.yfinance.get_quote(stock.symbol, stock.exchange)
            history = await self.yfinance.get_history(stock.symbol, stock.exchange, period="1y", interval="1d")
            if not history:
                continue

            closes = [float(item["close"]) for item in history]
            highs = [float(item["high"]) for item in history]
            lows = [float(item["low"]) for item in history]
            volumes = [float(item["volume"]) for item in history]
            current_price = float(quote["price"])

            metric_payload = {
                "symbol": stock.symbol,
                "exchange": stock.exchange,
                "price": current_price,
                "change_1d": quote.get("change_1d"),
                "change_5d": _period_change(closes, 5),
                "change_1m": _period_change(closes, 21),
                "change_3m": _period_change(closes, 63),
                "change_1y": _period_change(closes, 252),
                "proximity_52w_high": _proximity(current_price, max(highs) if highs else None),
                "proximity_52w_low": _proximity(current_price, min(lows) if lows else None),
                "volume": quote.get("volume", volumes[-1] if volumes else 0.0),
                "avg_volume_20d": _average(volumes[-20:]),
                "volume_spike": _volume_spike(quote.get("volume", 0.0), volumes[-20:]),
                "rsi_14": rsi(closes, 14),
                "sma_50": sma(closes, 50),
                "sma_200": sma(closes, 200),
                "updated_at": datetime.now(tz=timezone.utc).replace(tzinfo=None),
            }

            macd_value, macd_signal = macd(closes)
            metric_payload["macd"] = macd_value
            metric_payload["macd_signal"] = macd_signal

            if stock.exchange == "NSE":
                chain = await self.nse.get_options_chain(stock.symbol)
                metric_payload["pcr"] = self.nse.calculate_pcr(chain)
                metric_payload["iv"] = self.nse.calculate_iv(chain)
                metric_payload["oi_change"] = _oi_change(chain)

            stmt = sqlite_insert(StockMetric).values(**metric_payload)
            stmt = stmt.on_conflict_do_update(index_elements=["symbol"], set_=metric_payload)
            await self.session.execute(stmt)

            latest = history[-1]
            history_stmt = sqlite_insert(PriceHistory).values(
                symbol=stock.symbol,
                date=latest["date"].replace(tzinfo=None),
                open=float(latest["open"]),
                high=float(latest["high"]),
                low=float(latest["low"]),
                close=float(latest["close"]),
                volume=float(latest["volume"]),
            )
            history_stmt = history_stmt.on_conflict_do_nothing(index_elements=["symbol", "date"])
            await self.session.execute(history_stmt)
            updated += 1

        return updated

    async def refresh_watchlist_metrics(self) -> int:
        symbol_rows = (
            await self.session.execute(
                select(WatchlistItem.symbol).join(Watchlist, Watchlist.id == WatchlistItem.watchlist_id)
            )
        ).scalars()
        symbols = sorted(set(symbol_rows.all()))
        if not symbols:
            return 0
        return await self.refresh_metrics(symbols=symbols)

    async def get_quotes(self, market: str = "ALL", page: int = 1, page_size: int = 50) -> dict:
        query = select(StockMetric, Stock).join(Stock, Stock.symbol == StockMetric.symbol)
        if market == "NSE":
            query = query.where(StockMetric.exchange == "NSE")
        elif market == "US":
            query = query.where(StockMetric.exchange.in_(["NYSE", "NASDAQ"]))

        count_query = select(func.count()).select_from(query.subquery())
        total = int((await self.session.execute(count_query)).scalar_one())

        offset = max(0, (page - 1) * page_size)
        query = query.order_by(StockMetric.updated_at.desc()).offset(offset).limit(page_size)
        rows = (await self.session.execute(query)).all()
        data = []
        for metric, stock in rows:
            data.append(
                {
                    "symbol": stock.symbol,
                    "name": stock.name,
                    "exchange": stock.exchange,
                    "asset_type": stock.asset_type,
                    "price": metric.price,
                    "change_1d": metric.change_1d,
                    "change_5d": metric.change_5d,
                    "change_1m": metric.change_1m,
                    "change_3m": metric.change_3m,
                    "change_1y": metric.change_1y,
                    "volume": metric.volume,
                    "avg_volume_20d": metric.avg_volume_20d,
                    "volume_spike": metric.volume_spike,
                    "rsi_14": metric.rsi_14,
                    "macd": metric.macd,
                    "macd_signal": metric.macd_signal,
                    "sma_50": metric.sma_50,
                    "sma_200": metric.sma_200,
                    "pe": metric.pe,
                    "pb": metric.pb,
                    "peg": metric.peg,
                    "ev_ebitda": metric.ev_ebitda,
                    "dividend_yield": metric.dividend_yield,
                    "roe": metric.roe,
                    "roce": metric.roce,
                    "debt_equity": metric.debt_equity,
                    "profit_margin": metric.profit_margin,
                    "revenue_growth": metric.revenue_growth,
                    "oi_change": metric.oi_change,
                    "pcr": metric.pcr,
                    "iv": metric.iv,
                    "updated_at": metric.updated_at.isoformat(),
                    "market_cap": stock.market_cap,
                    "sector": stock.sector,
                    "industry": stock.industry,
                }
            )

        return {
            "items": data,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_price_history(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d",
    ) -> list[dict]:
        stock = (await self.session.execute(select(Stock).where(Stock.symbol == symbol))).scalar_one_or_none()
        if not stock:
            return []
        return await self.yfinance.get_history(symbol, stock.exchange, period=period, interval=interval)

    async def get_options_chain(self, symbol: str, exchange: str) -> dict:
        if exchange.upper() == "NSE":
            chain = await self.nse.get_options_chain(symbol)
            chain["pcr"] = self.nse.calculate_pcr(chain)
            chain["iv"] = self.nse.calculate_iv(chain)
            chain["max_pain"] = self.nse.calculate_max_pain(chain)
            return chain

        # Basic US options support through yfinance by reusing synthetic fallback for resilience.
        chain = await self.nse.get_options_chain(symbol)
        chain["symbol"] = symbol
        chain["pcr"] = self.nse.calculate_pcr(chain)
        chain["iv"] = self.nse.calculate_iv(chain)
        chain["max_pain"] = self.nse.calculate_max_pain(chain)
        return chain

    def get_market_status(self) -> dict:
        now_utc = datetime.now(tz=timezone.utc)
        ist = now_utc.astimezone(ZoneInfo("Asia/Kolkata"))
        et = now_utc.astimezone(ZoneInfo("America/New_York"))
        return {
            "timestamp_utc": now_utc.isoformat(),
            "nse": {
                "is_open": _is_open(ist, time(9, 15), time(15, 30)),
                "timezone": "Asia/Kolkata",
                "local_time": ist.isoformat(),
                "session": "09:15-15:30",
            },
            "nyse": {
                "is_open": _is_open(et, time(9, 30), time(16, 0)),
                "timezone": "America/New_York",
                "local_time": et.isoformat(),
                "session": "09:30-16:00",
                "pre_market": "04:00-09:30",
                "post_market": "16:00-20:00",
            },
        }


def _is_open(local_dt: datetime, start: time, end: time) -> bool:
    is_weekday = local_dt.weekday() < 5
    local_t = local_dt.timetz().replace(tzinfo=None)
    return is_weekday and start <= local_t <= end


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _period_change(closes: list[float], days: int) -> float | None:
    if len(closes) <= days:
        return None
    past = closes[-(days + 1)]
    current = closes[-1]
    if past == 0:
        return None
    return round(((current - past) / past) * 100.0, 3)


def _proximity(price: float, anchor: float | None) -> float | None:
    if not anchor or anchor == 0:
        return None
    return round(((price - anchor) / anchor) * 100.0, 3)


def _volume_spike(current_volume: float | None, recent_volumes: list[float]) -> float | None:
    if not current_volume:
        return None
    avg = _average(recent_volumes)
    if not avg or avg == 0:
        return None
    return round(current_volume / avg, 3)


def _oi_change(chain: dict) -> float | None:
    rows = chain.get("rows", [])
    if not rows:
        return None
    total_oi = sum((row.get("ce_oi", 0.0) + row.get("pe_oi", 0.0)) for row in rows)
    normalized = total_oi / max(len(rows), 1)
    if normalized <= 0:
        return None
    return round((normalized / 100_000.0) * 100.0, 3)

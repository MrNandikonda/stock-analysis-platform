from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.data_sources.yfinance_adapter import YFinanceAdapter
from app.models.entities import Fundamental, Stock, StockMetric


class FundamentalsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.adapter = YFinanceAdapter()

    async def refresh(self, symbols: Iterable[str] | None = None, limit: int | None = None) -> int:
        query = select(Stock)
        if symbols:
            query = query.where(Stock.symbol.in_(list(symbols)))
        if limit:
            query = query.limit(limit)
        stocks = (await self.session.execute(query)).scalars().all()

        refreshed = 0
        today = date.today()
        for stock in stocks:
            fundamentals = await self.adapter.get_fundamentals(stock.symbol, stock.exchange)

            fundamental_payload = {
                "symbol": stock.symbol,
                "date": today,
                **fundamentals,
            }
            stmt = sqlite_insert(Fundamental).values(**fundamental_payload)
            stmt = stmt.on_conflict_do_update(
                index_elements=["symbol", "date"],
                set_=fundamental_payload,
            )
            await self.session.execute(stmt)

            metric_payload = {
                "symbol": stock.symbol,
                "exchange": stock.exchange,
                "updated_at": datetime.now(tz=timezone.utc).replace(tzinfo=None),
                **fundamentals,
            }
            metric_stmt = sqlite_insert(StockMetric).values(**metric_payload)
            metric_stmt = metric_stmt.on_conflict_do_update(
                index_elements=["symbol"],
                set_=metric_payload,
            )
            await self.session.execute(metric_stmt)
            refreshed += 1

        return refreshed


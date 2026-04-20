from __future__ import annotations

import json
from typing import Any

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import BinaryExpression, ColumnElement

from app.models.entities import ScreenerPreset, Stock, StockMetric
from app.schemas.screener import SavePresetRequest, ScreenerFilter, ScreenerQuery


COLUMN_MAP: dict[str, Any] = {
    "symbol": Stock.symbol,
    "exchange": Stock.exchange,
    "asset_type": Stock.asset_type,
    "market_cap": Stock.market_cap,
    "sector": Stock.sector,
    "industry": Stock.industry,
    "price": StockMetric.price,
    "change_1d": StockMetric.change_1d,
    "change_5d": StockMetric.change_5d,
    "change_1m": StockMetric.change_1m,
    "change_3m": StockMetric.change_3m,
    "change_1y": StockMetric.change_1y,
    "proximity_52w_high": StockMetric.proximity_52w_high,
    "proximity_52w_low": StockMetric.proximity_52w_low,
    "volume": StockMetric.volume,
    "avg_volume_20d": StockMetric.avg_volume_20d,
    "volume_spike": StockMetric.volume_spike,
    "pe": StockMetric.pe,
    "pb": StockMetric.pb,
    "peg": StockMetric.peg,
    "ev_ebitda": StockMetric.ev_ebitda,
    "dividend_yield": StockMetric.dividend_yield,
    "roe": StockMetric.roe,
    "roce": StockMetric.roce,
    "debt_equity": StockMetric.debt_equity,
    "profit_margin": StockMetric.profit_margin,
    "revenue_growth": StockMetric.revenue_growth,
    "rsi_14": StockMetric.rsi_14,
    "macd": StockMetric.macd,
    "macd_signal": StockMetric.macd_signal,
    "sma_50": StockMetric.sma_50,
    "sma_200": StockMetric.sma_200,
    "oi_change": StockMetric.oi_change,
    "pcr": StockMetric.pcr,
    "iv": StockMetric.iv,
    "updated_at": StockMetric.updated_at,
}


class ScreenerService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def run(self, query: ScreenerQuery) -> dict:
        stmt = select(Stock, StockMetric).join(StockMetric, StockMetric.symbol == Stock.symbol)

        if query.market == "NSE":
            stmt = stmt.where(Stock.exchange == "NSE")
        elif query.market == "US":
            stmt = stmt.where(Stock.exchange.in_(["NYSE", "NASDAQ"]))

        filter_clauses = [self._build_clause(filter_item) for filter_item in query.filters]
        if filter_clauses:
            stmt = stmt.where(and_(*filter_clauses) if query.logic == "AND" else or_(*filter_clauses))

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total = int((await self.session.execute(total_stmt)).scalar_one())

        sort_column = COLUMN_MAP.get(query.sort_by, StockMetric.updated_at)
        order_fn = asc if query.sort_order == "asc" else desc
        stmt = stmt.order_by(order_fn(sort_column))
        stmt = stmt.offset((query.page - 1) * query.page_size).limit(query.page_size)

        rows = (await self.session.execute(stmt)).all()
        items = [self._serialize_row(stock, metric) for stock, metric in rows]
        return {"items": items, "total": total, "page": query.page, "page_size": query.page_size}

    async def list_presets(self) -> list[dict]:
        rows = (await self.session.execute(select(ScreenerPreset).order_by(ScreenerPreset.name.asc()))).scalars().all()
        return [
            {
                "id": row.id,
                "name": row.name,
                "query": json.loads(row.filter_json),
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]

    async def save_preset(self, payload: SavePresetRequest) -> dict:
        existing = (
            await self.session.execute(
                select(ScreenerPreset).where(
                    ScreenerPreset.user_id == "local",
                    ScreenerPreset.name == payload.name,
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.filter_json = payload.query.model_dump_json()
            preset = existing
        else:
            preset = ScreenerPreset(
                user_id="local",
                name=payload.name,
                filter_json=payload.query.model_dump_json(),
            )
            self.session.add(preset)

        await self.session.flush()
        return {"id": preset.id, "name": preset.name, "query": payload.query.model_dump()}

    async def delete_preset(self, preset_id: int) -> bool:
        preset = (
            await self.session.execute(
                select(ScreenerPreset).where(ScreenerPreset.id == preset_id, ScreenerPreset.user_id == "local")
            )
        ).scalar_one_or_none()
        if not preset:
            return False
        await self.session.delete(preset)
        return True

    def _build_clause(self, filter_item: ScreenerFilter) -> ColumnElement[bool]:
        left = COLUMN_MAP.get(filter_item.field)
        if left is None:
            raise ValueError(f"Unsupported filter field: {filter_item.field}")

        op = filter_item.operator
        value = filter_item.value
        if op == "eq":
            return left == value
        if op == "neq":
            return left != value
        if op == "lt":
            return left < value
        if op == "lte":
            return left <= value
        if op == "gt":
            return left > value
        if op == "gte":
            return left >= value
        if op == "between":
            if not isinstance(value, list) or len(value) != 2:
                raise ValueError("between operator expects a 2-value list")
            return left.between(value[0], value[1])
        if op == "contains":
            return left.ilike(f"%{value}%")
        if op == "in":
            if not isinstance(value, list):
                raise ValueError("in operator expects a list")
            return left.in_(value)
        if op in {"gt_field", "lt_field"}:
            right = COLUMN_MAP.get(str(value))
            if right is None:
                raise ValueError(f"Unsupported comparison field: {value}")
            return (left > right) if op == "gt_field" else (left < right)

        raise ValueError(f"Unsupported operator: {op}")

    def _serialize_row(self, stock: Stock, metric: StockMetric) -> dict:
        return {
            "symbol": stock.symbol,
            "name": stock.name,
            "exchange": stock.exchange,
            "asset_type": stock.asset_type,
            "sector": stock.sector,
            "industry": stock.industry,
            "market_cap": stock.market_cap,
            "price": metric.price,
            "change_1d": metric.change_1d,
            "change_5d": metric.change_5d,
            "change_1m": metric.change_1m,
            "change_3m": metric.change_3m,
            "change_1y": metric.change_1y,
            "proximity_52w_high": metric.proximity_52w_high,
            "proximity_52w_low": metric.proximity_52w_low,
            "volume": metric.volume,
            "avg_volume_20d": metric.avg_volume_20d,
            "volume_spike": metric.volume_spike,
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
            "rsi_14": metric.rsi_14,
            "macd": metric.macd,
            "macd_signal": metric.macd_signal,
            "sma_50": metric.sma_50,
            "sma_200": metric.sma_200,
            "oi_change": metric.oi_change,
            "pcr": metric.pcr,
            "iv": metric.iv,
            "updated_at": metric.updated_at.isoformat() if metric.updated_at else None,
        }


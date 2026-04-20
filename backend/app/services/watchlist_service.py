from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Alert, Stock, StockMetric, Watchlist, WatchlistItem


class WatchlistService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_watchlists(self) -> list[dict]:
        watchlists = (
            await self.session.execute(
                select(Watchlist).where(Watchlist.user_id == "local").order_by(Watchlist.created_at.asc())
            )
        ).scalars().all()

        result: list[dict] = []
        for watchlist in watchlists:
            symbol_rows = (
                await self.session.execute(
                    select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist.id)
                )
            ).scalars().all()

            items = []
            if symbol_rows:
                metrics = (
                    await self.session.execute(select(StockMetric).where(StockMetric.symbol.in_(symbol_rows)))
                ).scalars().all()
                metric_map = {row.symbol: row for row in metrics}
                for symbol in symbol_rows:
                    metric = metric_map.get(symbol)
                    items.append(
                        {
                            "symbol": symbol,
                            "price": metric.price if metric else None,
                            "change_1d": metric.change_1d if metric else None,
                            "updated_at": metric.updated_at.isoformat() if metric and metric.updated_at else None,
                        }
                    )

            result.append(
                {
                    "id": watchlist.id,
                    "name": watchlist.name,
                    "created_at": watchlist.created_at.isoformat(),
                    "items": items,
                }
            )
        return result

    async def create_watchlist(self, name: str) -> dict:
        watchlist = Watchlist(user_id="local", name=name)
        self.session.add(watchlist)
        await self.session.flush()
        return {"id": watchlist.id, "name": watchlist.name, "created_at": watchlist.created_at.isoformat()}

    async def add_items(self, watchlist_id: int, symbols: list[str]) -> int:
        cleaned_symbols = sorted({symbol.strip().upper() for symbol in symbols if symbol.strip()})
        for symbol in cleaned_symbols:
            stock = (await self.session.execute(select(Stock).where(Stock.symbol == symbol))).scalar_one_or_none()
            if not stock:
                self.session.add(
                    Stock(
                        symbol=symbol,
                        exchange="NASDAQ",
                        name=symbol,
                        sector="Unknown",
                        industry="Unknown",
                        market_cap=0.0,
                        asset_type="EQUITY",
                    )
                )
        await self.session.flush()

        inserted = 0
        for symbol in cleaned_symbols:
            exists = (
                await self.session.execute(
                    select(WatchlistItem).where(
                        WatchlistItem.watchlist_id == watchlist_id,
                        WatchlistItem.symbol == symbol,
                    )
                )
            ).scalar_one_or_none()
            if exists:
                continue
            self.session.add(WatchlistItem(watchlist_id=watchlist_id, symbol=symbol))
            inserted += 1
        return inserted

    async def remove_item(self, watchlist_id: int, symbol: str) -> bool:
        item = (
            await self.session.execute(
                select(WatchlistItem).where(
                    WatchlistItem.watchlist_id == watchlist_id,
                    WatchlistItem.symbol == symbol.upper(),
                )
            )
        ).scalar_one_or_none()
        if not item:
            return False
        await self.session.delete(item)
        return True

    async def import_csv(self, watchlist_id: int, csv_data: str) -> int:
        reader = csv.DictReader(io.StringIO(csv_data))
        symbols = []
        for row in reader:
            symbol = row.get("symbol") or row.get("Symbol") or row.get("ticker") or row.get("Ticker")
            if symbol:
                symbols.append(symbol)
        if not symbols:
            return 0
        return await self.add_items(watchlist_id=watchlist_id, symbols=symbols)

    async def list_alerts(self) -> list[dict]:
        alerts = (await self.session.execute(select(Alert).where(Alert.user_id == "local"))).scalars().all()
        return [
            {
                "id": alert.id,
                "symbol": alert.symbol,
                "condition": alert.condition,
                "target_value": alert.target_value,
                "triggered": alert.triggered,
                "created_at": alert.created_at.isoformat(),
            }
            for alert in alerts
        ]

    async def create_alert(self, symbol: str, condition: str, target_value: float) -> dict:
        alert = Alert(
            user_id="local",
            symbol=symbol.upper(),
            condition=condition,
            target_value=target_value,
            triggered=False,
        )
        self.session.add(alert)
        await self.session.flush()
        return {"id": alert.id, "symbol": alert.symbol, "condition": alert.condition, "target_value": alert.target_value}

    async def evaluate_alerts(self) -> list[dict]:
        alerts = (await self.session.execute(select(Alert).where(Alert.user_id == "local", Alert.triggered.is_(False)))).scalars().all()
        triggered_payload = []
        for alert in alerts:
            metric = (await self.session.execute(select(StockMetric).where(StockMetric.symbol == alert.symbol))).scalar_one_or_none()
            if not metric:
                continue
            if _is_triggered(alert.condition, alert.target_value, metric):
                alert.triggered = True
                triggered_payload.append(
                    {
                        "id": alert.id,
                        "symbol": alert.symbol,
                        "condition": alert.condition,
                        "target_value": alert.target_value,
                        "triggered_at": datetime.now(tz=timezone.utc).isoformat(),
                    }
                )
        return triggered_payload


def _is_triggered(condition: str, target: float, metric: StockMetric) -> bool:
    condition = condition.lower().strip()
    if condition == "price_gt":
        return (metric.price or 0) > target
    if condition == "price_lt":
        return (metric.price or 0) < target
    if condition == "change_1d_gt":
        return (metric.change_1d or 0) > target
    if condition == "volume_spike_gt":
        return (metric.volume_spike or 0) > target
    return False


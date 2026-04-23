from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import PortfolioHistory, PortfolioHolding, Stock, StockMetric
from app.services.market_service import MarketService


class PortfolioService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_holdings(self) -> list[dict]:
        holdings = (
            await self.session.execute(
                select(PortfolioHolding)
                .where(PortfolioHolding.user_id == "local")
                .order_by(PortfolioHolding.buy_date.desc())
            )
        ).scalars().all()
        symbols = [holding.symbol for holding in holdings]
        metrics = (
            await self.session.execute(select(StockMetric).where(StockMetric.symbol.in_(symbols)))
        ).scalars().all() if symbols else []
        metric_map = {metric.symbol: metric for metric in metrics}

        results = []
        for holding in holdings:
            metric = metric_map.get(holding.symbol)
            current_price = metric.price if metric else 0.0
            market_value = current_price * holding.quantity
            invested = holding.avg_price * holding.quantity
            pnl = market_value - invested
            day_change = ((metric.change_1d or 0.0) / 100.0) * market_value if metric else 0.0

            results.append(
                {
                    "id": holding.id,
                    "symbol": holding.symbol,
                    "quantity": holding.quantity,
                    "avg_price": holding.avg_price,
                    "buy_date": holding.buy_date.isoformat(),
                    "asset_class": holding.asset_class,
                    "current_price": current_price,
                    "market_value": round(market_value, 2),
                    "invested_value": round(invested, 2),
                    "unrealized_pnl": round(pnl, 2),
                    "day_change": round(day_change, 2),
                    "xirr": round(_annualized_return(holding.buy_date, invested, market_value), 4),
                }
            )
        return results

    async def add_holding(
        self,
        symbol: str,
        quantity: float,
        avg_price: float,
        buy_date: date,
        asset_class: str,
    ) -> dict:
        symbol = symbol.upper().strip()
        stock = (await self.session.execute(select(Stock).where(Stock.symbol == symbol))).scalar_one_or_none()
        if not stock:
            market_service = MarketService(self.session)
            search_results = await market_service.search_symbol(symbol)
            if not search_results:
                raise ValueError(f"Invalid or unrecognized symbol: {symbol}")
            best_match = search_results[0]
            self.session.add(
                Stock(
                    symbol=symbol,
                    exchange=best_match["exchange"],
                    name=symbol,
                    sector="Unknown",
                    industry="Unknown",
                    market_cap=0.0,
                    asset_type=asset_class.upper(),
                )
            )

        holding = PortfolioHolding(
            user_id="local",
            symbol=symbol,
            quantity=quantity,
            avg_price=avg_price,
            buy_date=buy_date,
            asset_class=asset_class,
        )
        self.session.add(holding)
        await self.session.flush()
        return {
            "id": holding.id,
            "symbol": holding.symbol,
            "quantity": holding.quantity,
            "avg_price": holding.avg_price,
            "buy_date": holding.buy_date.isoformat(),
            "asset_class": holding.asset_class,
        }

    async def delete_holding(self, holding_id: int) -> bool:
        holding = (
            await self.session.execute(
                select(PortfolioHolding).where(PortfolioHolding.id == holding_id, PortfolioHolding.user_id == "local")
            )
        ).scalar_one_or_none()
        if not holding:
            return False
        await self.session.delete(holding)
        return True

    async def import_csv(self, csv_data: str) -> int:
        reader = csv.DictReader(io.StringIO(csv_data))
        created = 0
        for row in reader:
            symbol = (row.get("symbol") or row.get("Symbol") or row.get("ticker") or row.get("Ticker") or "").strip()
            quantity = row.get("quantity") or row.get("Quantity") or row.get("qty") or row.get("Qty")
            avg_price = row.get("avg_price") or row.get("Avg Price") or row.get("price") or row.get("Price")
            buy_date = row.get("buy_date") or row.get("Buy Date") or row.get("date")
            asset_class = (row.get("asset_class") or row.get("Asset Class") or "equity").strip().lower()
            if not symbol or not quantity or not avg_price:
                continue

            parsed_date = date.fromisoformat(buy_date) if buy_date else date.today()
            try:
                await self.add_holding(
                    symbol=symbol,
                    quantity=float(quantity),
                    avg_price=float(avg_price),
                    buy_date=parsed_date,
                    asset_class=asset_class,
                )
                created += 1
            except ValueError:
                pass  # Skip invalid symbols during import
        return created

    async def summary(self) -> dict:
        holdings = await self.list_holdings()
        total_invested = sum(item["invested_value"] for item in holdings)
        total_value = sum(item["market_value"] for item in holdings)
        total_pnl = total_value - total_invested
        total_day_change = sum(item["day_change"] for item in holdings)

        by_sector: dict[str, float] = {}
        by_asset_class: dict[str, float] = {}
        for item in holdings:
            stock = (await self.session.execute(select(Stock).where(Stock.symbol == item["symbol"]))).scalar_one_or_none()
            sector = stock.sector if stock and stock.sector else "Unknown"
            by_sector[sector] = by_sector.get(sector, 0.0) + item["market_value"]
            by_asset_class[item["asset_class"]] = by_asset_class.get(item["asset_class"], 0.0) + item["market_value"]

        return {
            "timestamp_utc": datetime.now(tz=timezone.utc).isoformat(),
            "total_invested": round(total_invested, 2),
            "total_value": round(total_value, 2),
            "unrealized_pnl": round(total_pnl, 2),
            "day_change": round(total_day_change, 2),
            "xirr": round(_portfolio_xirr(holdings), 4),
            "sector_allocation": by_sector,
            "asset_class_split": by_asset_class,
            "holdings_count": len(holdings),
        }

    async def snapshot_portfolio(self) -> dict:
        summary = await self.summary()
        today_str = date.today().isoformat()
        
        existing = (
            await self.session.execute(
                select(PortfolioHistory).where(
                    PortfolioHistory.user_id == "local",
                    PortfolioHistory.date == today_str
                )
            )
        ).scalar_one_or_none()
        
        if existing:
            existing.total_invested = summary["total_invested"]
            existing.total_value = summary["total_value"]
            existing.unrealized_pnl = summary["unrealized_pnl"]
            existing.day_change = summary["day_change"]
        else:
            history_obj = PortfolioHistory(
                user_id="local",
                date=today_str,
                total_invested=summary["total_invested"],
                total_value=summary["total_value"],
                unrealized_pnl=summary["unrealized_pnl"],
                day_change=summary["day_change"],
            )
            self.session.add(history_obj)
            
        await self.session.flush()
        return {"status": "success", "date": today_str, "total_value": summary["total_value"]}

    async def get_equity_curve(self, days: int = 90) -> list[dict]:
        query = select(PortfolioHistory).where(PortfolioHistory.user_id == "local").order_by(PortfolioHistory.date.desc()).limit(days)
        history = (await self.session.execute(query)).scalars().all()
        
        return [{"date": h.date, "total_value": h.total_value, "total_invested": h.total_invested, "unrealized_pnl": h.unrealized_pnl} for h in reversed(history)]

def _annualized_return(buy_date: date, invested: float, current_value: float) -> float:
    if invested <= 0 or current_value <= 0:
        return 0.0
    days = (date.today() - buy_date).days
    if days <= 0:
        return 0.0
    years = days / 365.25
    return (current_value / invested) ** (1 / years) - 1


def _portfolio_xirr(holdings: list[dict]) -> float:
    if not holdings:
        return 0.0
    weighted = 0.0
    total_value = 0.0
    for holding in holdings:
        value = holding["market_value"]
        weighted += value * holding["xirr"]
        total_value += value
    return (weighted / total_value) if total_value else 0.0

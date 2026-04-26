from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.portfolio import ImportPortfolioCsvRequest, PortfolioHoldingRequest
from app.services.market_service import MarketService
from app.services.portfolio_service import PortfolioService


router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("")
async def list_portfolio(session: AsyncSession = Depends(get_db_session)) -> list[dict]:
    return await PortfolioService(session).list_holdings()


@router.get("/summary")
async def portfolio_summary(session: AsyncSession = Depends(get_db_session)) -> dict:
    return await PortfolioService(session).summary()


@router.get("/history")
async def portfolio_history(days: int = 90, session: AsyncSession = Depends(get_db_session)) -> list[dict]:
    return await PortfolioService(session).get_equity_curve(days=days)


@router.get("/health")
async def portfolio_health(session: AsyncSession = Depends(get_db_session)) -> dict:
    return await PortfolioService(session).health_report()


@router.post("")
async def add_holding(payload: PortfolioHoldingRequest, session: AsyncSession = Depends(get_db_session)) -> dict:
    result = await PortfolioService(session).add_holding(
        symbol=payload.symbol,
        quantity=payload.quantity,
        avg_price=payload.avg_price,
        buy_date=payload.buy_date,
        asset_class=payload.asset_class,
    )
    await MarketService(session).refresh_metrics(symbols=[payload.symbol])
    await session.commit()
    return result


@router.delete("/{holding_id}")
async def delete_holding(holding_id: int, session: AsyncSession = Depends(get_db_session)) -> dict:
    deleted = await PortfolioService(session).delete_holding(holding_id=holding_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Holding not found")
    await session.commit()
    return {"deleted": True}


@router.post("/import-csv")
async def import_portfolio(payload: ImportPortfolioCsvRequest, session: AsyncSession = Depends(get_db_session)) -> dict:
    created = await PortfolioService(session).import_csv(payload.csv_data)
    await session.commit()
    return {"created": created}

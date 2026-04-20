from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.watchlist import AddWatchlistItemsRequest, CreateAlertRequest, CreateWatchlistRequest, ImportWatchlistCsvRequest
from app.services.market_service import MarketService
from app.services.watchlist_service import WatchlistService


router = APIRouter(prefix="/watchlists", tags=["watchlists"])


@router.get("")
async def list_watchlists(session: AsyncSession = Depends(get_db_session)) -> list[dict]:
    return await WatchlistService(session).list_watchlists()


@router.post("")
async def create_watchlist(payload: CreateWatchlistRequest, session: AsyncSession = Depends(get_db_session)) -> dict:
    result = await WatchlistService(session).create_watchlist(payload.name)
    await session.commit()
    return result


@router.post("/{watchlist_id}/items")
async def add_items(
    watchlist_id: int,
    payload: AddWatchlistItemsRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    inserted = await WatchlistService(session).add_items(watchlist_id, payload.symbols)
    await MarketService(session).refresh_metrics(symbols=payload.symbols)
    await session.commit()
    return {"inserted": inserted}


@router.delete("/{watchlist_id}/items/{symbol}")
async def remove_item(watchlist_id: int, symbol: str, session: AsyncSession = Depends(get_db_session)) -> dict:
    deleted = await WatchlistService(session).remove_item(watchlist_id=watchlist_id, symbol=symbol)
    if not deleted:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    await session.commit()
    return {"deleted": True}


@router.post("/{watchlist_id}/import-csv")
async def import_csv(
    watchlist_id: int,
    payload: ImportWatchlistCsvRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    inserted = await WatchlistService(session).import_csv(watchlist_id=watchlist_id, csv_data=payload.csv_data)
    await session.commit()
    return {"inserted": inserted}


@router.get("/alerts")
async def list_alerts(session: AsyncSession = Depends(get_db_session)) -> list[dict]:
    return await WatchlistService(session).list_alerts()


@router.post("/alerts")
async def create_alert(payload: CreateAlertRequest, session: AsyncSession = Depends(get_db_session)) -> dict:
    result = await WatchlistService(session).create_alert(
        symbol=payload.symbol,
        condition=payload.condition,
        target_value=payload.target_value,
    )
    await session.commit()
    return result


@router.post("/alerts/check")
async def check_alerts(session: AsyncSession = Depends(get_db_session)) -> dict:
    triggered = await WatchlistService(session).evaluate_alerts()
    await session.commit()
    return {"triggered": triggered}


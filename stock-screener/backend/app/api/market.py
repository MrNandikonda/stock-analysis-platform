from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.market import HistoryItem, MarketStatusResponse, QuotesResponse
from app.services.market_service import MarketService


router = APIRouter(prefix="/market", tags=["market"])


@router.get("/status", response_model=MarketStatusResponse)
async def market_status(session: AsyncSession = Depends(get_db_session)) -> dict:
    service = MarketService(session)
    return service.get_market_status()


@router.get("/quotes", response_model=QuotesResponse)
async def market_quotes(
    market: str = Query(default="ALL", pattern="^(ALL|NSE|US)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    service = MarketService(session)
    return await service.get_quotes(market=market, page=page, page_size=page_size)


@router.post("/refresh")
async def refresh_market_data(
    limit: int = Query(default=100, ge=1, le=500),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, int]:
    service = MarketService(session)
    updated = await service.refresh_metrics(limit=limit)
    await session.commit()
    return {"updated": updated}


@router.get("/history/{symbol}", response_model=list[HistoryItem])
async def price_history(
    symbol: str,
    period: str = Query(default="1y"),
    interval: str = Query(default="1d"),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    service = MarketService(session)
    return await service.get_price_history(symbol=symbol.upper(), period=period, interval=interval)


@router.get("/options/{symbol}")
async def options_chain(
    symbol: str,
    exchange: str = Query(default="NSE", pattern="^(NSE|NYSE|NASDAQ|US)$"),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    service = MarketService(session)
    normalized_exchange = "NSE" if exchange == "NSE" else "US"
    return await service.get_options_chain(symbol=symbol.upper(), exchange=normalized_exchange)


@router.get("/stream")
async def stream_quotes(
    market: str = Query(default="ALL", pattern="^(ALL|NSE|US)$"),
    session: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    service = MarketService(session)

    async def event_gen():
        while True:
            payload = await service.get_quotes(market=market, page=1, page_size=50)
            payload["server_time_utc"] = datetime.now(tz=timezone.utc).isoformat()
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(30)

    return StreamingResponse(event_gen(), media_type="text/event-stream")

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.news_service import NewsService


router = APIRouter(prefix="/news", tags=["news"])


@router.get("")
async def list_news(
    symbols: str | None = Query(default=None, description="Comma-separated symbols"),
    limit: int = Query(default=30, ge=1, le=100),
) -> list[dict]:
    parsed_symbols = [value.strip().upper() for value in symbols.split(",")] if symbols else None
    return await NewsService().fetch_news(symbols=parsed_symbols, limit=limit)


@router.get("/earnings-calendar")
async def earnings_calendar(symbols: str | None = Query(default=None)) -> list[dict]:
    parsed_symbols = [value.strip().upper() for value in symbols.split(",")] if symbols else None
    return await NewsService().earnings_calendar(symbols=parsed_symbols)


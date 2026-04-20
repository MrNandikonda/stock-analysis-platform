from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.schemas import AIRunRequest, AIWatchlistSettingsPayload
from app.ai.services.analysis_service import AIAnalysisService
from app.core.database import get_db_session


router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status")
async def get_ai_status(session: AsyncSession = Depends(get_db_session)) -> dict:
    return await AIAnalysisService(session).get_status()


@router.get("/watchlists/{watchlist_id}/settings")
async def get_watchlist_settings(watchlist_id: int, session: AsyncSession = Depends(get_db_session)) -> dict:
    try:
        return await AIAnalysisService(session).get_watchlist_settings(watchlist_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/watchlists/{watchlist_id}/settings")
async def update_watchlist_settings(
    watchlist_id: int,
    payload: AIWatchlistSettingsPayload,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    try:
        result = await AIAnalysisService(session).update_watchlist_settings(watchlist_id, payload)
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/watchlists/{watchlist_id}/run")
async def run_watchlist_analysis(
    watchlist_id: int,
    payload: AIRunRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    try:
        result = await AIAnalysisService(session).run_watchlist_now(watchlist_id, force=payload.force)
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/watchlists/{watchlist_id}/summary")
async def get_watchlist_summary(watchlist_id: int, session: AsyncSession = Depends(get_db_session)) -> dict:
    try:
        return await AIAnalysisService(session).get_watchlist_summary(watchlist_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/watchlists/{watchlist_id}/analyses")
async def list_watchlist_analyses(watchlist_id: int, session: AsyncSession = Depends(get_db_session)) -> list[dict]:
    try:
        return await AIAnalysisService(session).list_watchlist_analyses(watchlist_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/watchlists/{watchlist_id}/analyses/{symbol}")
async def get_stock_analysis_detail(
    watchlist_id: int,
    symbol: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    try:
        return await AIAnalysisService(session).get_stock_analysis_detail(watchlist_id, symbol)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/diagnostics")
async def get_ai_diagnostics(session: AsyncSession = Depends(get_db_session)) -> dict:
    return await AIAnalysisService(session).get_diagnostics()

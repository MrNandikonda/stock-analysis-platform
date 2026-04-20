from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.screener import SavePresetRequest, ScreenerQuery
from app.services.screener_service import ScreenerService


router = APIRouter(prefix="/screener", tags=["screener"])


@router.post("/run")
async def run_screener(payload: ScreenerQuery, session: AsyncSession = Depends(get_db_session)) -> dict:
    service = ScreenerService(session)
    try:
        return await service.run(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/presets")
async def list_presets(session: AsyncSession = Depends(get_db_session)) -> list[dict]:
    return await ScreenerService(session).list_presets()


@router.post("/presets")
async def save_preset(payload: SavePresetRequest, session: AsyncSession = Depends(get_db_session)) -> dict:
    response = await ScreenerService(session).save_preset(payload)
    await session.commit()
    return response


@router.delete("/presets/{preset_id}")
async def delete_preset(preset_id: int, session: AsyncSession = Depends(get_db_session)) -> dict:
    deleted = await ScreenerService(session).delete_preset(preset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Preset not found")
    await session.commit()
    return {"deleted": True}


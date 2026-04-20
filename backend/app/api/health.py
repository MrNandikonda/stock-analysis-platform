from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings


router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "ai_analysis_enabled": "true" if settings.ai_analysis_enabled else "false",
    }

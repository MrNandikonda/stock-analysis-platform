from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.services.analyst_report_service import AnalystReportService

router = APIRouter(prefix="/market", tags=["analyst-report"])


@router.get("/report/{symbol}")
async def get_analyst_report(symbol: str, session: AsyncSession = Depends(get_db_session)) -> dict:
    """
    Generate a rule-based retail analyst report for a given symbol.
    Data is derived entirely from locally stored StockMetric and Stock tables.
    Freshness label indicates whether the underlying metrics are current.
    """
    return await AnalystReportService(session).generate(symbol)

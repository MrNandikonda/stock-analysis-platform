from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.services.fundamentals_service import FundamentalsService
from app.services.market_service import MarketService


logger = logging.getLogger(__name__)


def create_scheduler(session_factory: async_sessionmaker) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")

    async def refresh_watchlist_prices_job() -> None:
        async with session_factory() as session:
            try:
                updated = await MarketService(session).refresh_watchlist_metrics()
                await session.commit()
                logger.info("watchlist prices updated: %s", updated)
            except Exception as exc:  # pragma: no cover
                await session.rollback()
                logger.exception("watchlist refresh failed: %s", exc)

    async def refresh_fno_job() -> None:
        async with session_factory() as session:
            try:
                updated = await MarketService(session).refresh_metrics(limit=120)
                await session.commit()
                logger.info("fno metrics updated: %s", updated)
            except Exception as exc:  # pragma: no cover
                await session.rollback()
                logger.exception("fno refresh failed: %s", exc)

    async def refresh_fundamentals_job() -> None:
        async with session_factory() as session:
            try:
                updated = await FundamentalsService(session).refresh(limit=120)
                await session.commit()
                logger.info("fundamentals updated: %s", updated)
            except Exception as exc:  # pragma: no cover
                await session.rollback()
                logger.exception("fundamentals refresh failed: %s", exc)

    async def eod_ohlcv_job() -> None:
        async with session_factory() as session:
            try:
                updated = await MarketService(session).refresh_metrics(limit=250)
                await session.commit()
                logger.info("eod snapshot saved at %s for %s symbols", datetime.now(tz=timezone.utc), updated)
            except Exception as exc:  # pragma: no cover
                await session.rollback()
                logger.exception("eod snapshot failed: %s", exc)

    scheduler.add_job(
        refresh_watchlist_prices_job,
        "interval",
        minutes=1,
        id="watchlist_prices_1m",
        coalesce=True,
        max_instances=1,
        misfire_grace_time=30,
    )
    scheduler.add_job(
        refresh_fno_job,
        "interval",
        minutes=15,
        id="fno_refresh_15m",
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        refresh_fundamentals_job,
        "interval",
        hours=1,
        id="fundamentals_1h",
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        eod_ohlcv_job,
        "cron",
        hour=22,
        minute=15,
        id="eod_ohlcv",
        coalesce=True,
        max_instances=1,
    )
    return scheduler


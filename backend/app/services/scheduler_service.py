from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.ai.orchestrator import AIWatchlistOrchestrator
from app.core.config import get_settings
from app.services.fundamentals_service import FundamentalsService
from app.services.market_service import MarketService
from app.services.portfolio_service import PortfolioService


logger = logging.getLogger(__name__)
settings = get_settings()


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

    async def snapshot_portfolio_job() -> None:
        async with session_factory() as session:
            try:
                result = await PortfolioService(session).snapshot_portfolio()
                await session.commit()
                logger.info("portfolio snapshot saved for %s: %s", result["date"], result["total_value"])
            except Exception as exc:  # pragma: no cover
                await session.rollback()
                logger.exception("portfolio snapshot failed: %s", exc)

    async def refresh_ai_watchlists_job() -> None:
        if not settings.ai_analysis_enabled:
            return
        async with session_factory() as session:
            try:
                # Bound AI orchestrator runs to avoid runaway jobs
                try:
                    results = await asyncio.wait_for(AIWatchlistOrchestrator(session).run_due_watchlists(), timeout=600)
                except asyncio.TimeoutError:
                    await session.rollback()
                    logger.warning("ai watchlist refresh timed out")
                    return
                await session.commit()
                logger.info("ai watchlist jobs processed: %s", len(results))
            except Exception as exc:  # pragma: no cover
                await session.rollback()
                logger.exception("ai watchlist refresh failed: %s", exc)

    async def cleanup_ai_jobs_job() -> None:
        if not settings.ai_analysis_enabled:
            return
        async with session_factory() as session:
            try:
                marked = await AIWatchlistOrchestrator(session).cleanup_stale_jobs()
                await session.commit()
                logger.info("ai stale jobs marked: %s", marked)
            except Exception as exc:  # pragma: no cover
                await session.rollback()
                logger.exception("ai stale cleanup failed: %s", exc)

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
    scheduler.add_job(
        snapshot_portfolio_job,
        "cron",
        hour=22,
        minute=30,
        id="portfolio_snapshot",
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        refresh_ai_watchlists_job,
        "interval",
        minutes=1,
        id="ai_watchlist_refresh_1m",
        coalesce=True,
        max_instances=1,
        misfire_grace_time=30,
    )
    scheduler.add_job(
        cleanup_ai_jobs_job,
        "interval",
        minutes=10,
        id="ai_stale_cleanup_10m",
        coalesce=True,
        max_instances=1,
        misfire_grace_time=60,
    )
    return scheduler

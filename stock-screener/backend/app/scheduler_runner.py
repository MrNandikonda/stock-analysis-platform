from __future__ import annotations

import asyncio
import signal

from app.core.cache import initialize_cache
from app.core.database import Base, async_session_factory, engine
from app.services.bootstrap_service import bootstrap_data
from app.services.scheduler_service import create_scheduler


async def _prepare_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        await bootstrap_data(session)
        await session.commit()


async def run_scheduler() -> None:
    initialize_cache()
    await _prepare_database()
    scheduler = create_scheduler(async_session_factory)
    scheduler.start()

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)

    await stop_event.wait()
    scheduler.shutdown(wait=False)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_scheduler())


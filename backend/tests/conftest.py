from __future__ import annotations

from datetime import datetime, timezone

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models.entities import Stock, StockMetric


@pytest_asyncio.fixture
async def db_session(tmp_path) -> AsyncSession:
    db_file = tmp_path / "test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_file}", future=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def seeded_session(db_session: AsyncSession) -> AsyncSession:
    stocks = [
        Stock(symbol="AAA", exchange="NSE", name="AAA Ltd", sector="Tech", industry="Software", market_cap=1000),
        Stock(symbol="BBB", exchange="NSE", name="BBB Ltd", sector="Finance", industry="Bank", market_cap=2000),
        Stock(symbol="CCC", exchange="NASDAQ", name="CCC Inc", sector="Tech", industry="Hardware", market_cap=3000),
    ]
    metrics = [
        StockMetric(
            symbol="AAA",
            exchange="NSE",
            price=100,
            pe=10,
            roe=20,
            debt_equity=0.2,
            change_1m=12,
            volume_spike=1.8,
            macd=1.3,
            macd_signal=0.8,
            updated_at=datetime.now(tz=timezone.utc).replace(tzinfo=None),
        ),
        StockMetric(
            symbol="BBB",
            exchange="NSE",
            price=80,
            pe=30,
            roe=8,
            debt_equity=1.4,
            change_1m=2,
            volume_spike=0.9,
            macd=-0.2,
            macd_signal=0.1,
            updated_at=datetime.now(tz=timezone.utc).replace(tzinfo=None),
        ),
        StockMetric(
            symbol="CCC",
            exchange="NASDAQ",
            price=250,
            pe=25,
            roe=14,
            debt_equity=0.7,
            change_1m=15,
            volume_spike=2.2,
            macd=2.0,
            macd_signal=1.9,
            updated_at=datetime.now(tz=timezone.utc).replace(tzinfo=None),
        ),
    ]
    db_session.add_all(stocks + metrics)
    await db_session.commit()
    return db_session


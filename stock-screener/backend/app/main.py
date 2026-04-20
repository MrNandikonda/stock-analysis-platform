from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.health import router as health_router
from app.api.market import router as market_router
from app.core.cache import initialize_cache
from app.core.config import get_settings
from app.core.database import Base, async_session_factory, engine
from app.services.bootstrap_service import bootstrap_data
from app.services.fundamentals_service import FundamentalsService
from app.services.market_service import MarketService
from app.services.scheduler_service import create_scheduler


settings = get_settings()
security = HTTPBasic(auto_error=False)


async def _initialize_data() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        await bootstrap_data(session)
        await MarketService(session).refresh_metrics(limit=80)
        await FundamentalsService(session).refresh(limit=80)
        await session.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_cache()
    await _initialize_data()

    scheduler = None
    if settings.run_scheduler_in_api:
        scheduler = create_scheduler(async_session_factory)
        scheduler.start()

    try:
        yield
    finally:
        if scheduler:
            scheduler.shutdown(wait=False)
        await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


async def enforce_basic_auth(credentials: HTTPBasicCredentials | None) -> None:
    if not settings.basic_auth_user or not settings.basic_auth_password:
        return
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if credentials.username != settings.basic_auth_user or credentials.password != settings.basic_auth_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")


app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(market_router, prefix=settings.api_prefix)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": settings.app_name, "docs": "/docs"}


from __future__ import annotations

import asyncio
import base64
import logging
import secrets
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.ai.router import router as ai_router
from app.ai.services.config_service import AIConfigService
from app.api.health import router as health_router
from app.api.market import router as market_router
from app.api.news import router as news_router
from app.api.portfolio import router as portfolio_router
from app.api.screener import router as screener_router
from app.api.watchlists import router as watchlist_router
from app.core.cache import initialize_cache
from app.core.config import get_settings
from app.core.database import Base, async_session_factory, engine
from app.services.bootstrap_service import bootstrap_data
from app.services.fundamentals_service import FundamentalsService
from app.services.market_service import MarketService
from app.services.scheduler_service import create_scheduler


settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class RequestBucket:
    tokens: float
    last_refill: float


_request_buckets: dict[str, RequestBucket] = {}


async def _initialize_data() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        await bootstrap_data(session)
        await AIConfigService(session).sync_provider_defaults()
        await session.commit()


async def _warm_start_data() -> None:
    async with async_session_factory() as session:
        try:
            await asyncio.wait_for(MarketService(session).refresh_metrics(limit=40), timeout=120)
            await asyncio.wait_for(FundamentalsService(session).refresh(limit=40), timeout=120)
            await session.commit()
            logger.info("background warm start data refresh completed")
        except Exception as exc:  # pragma: no cover
            await session.rollback()
            logger.warning("background warm start skipped or failed: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_cache()
    await _initialize_data()
    warm_start_task = asyncio.create_task(_warm_start_data())

    scheduler = None
    if settings.run_scheduler_in_api:
        scheduler = create_scheduler(async_session_factory)
        scheduler.start()

    try:
        yield
    finally:
        if warm_start_task and not warm_start_task.done():
            warm_start_task.cancel()
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


@app.middleware("http")
async def optional_basic_auth(request: Request, call_next):
    if not settings.basic_auth_user or not settings.basic_auth_password:
        return await call_next(request)

    if request.url.path.endswith("/health"):
        return await call_next(request)

    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Basic "):
        return _auth_required_response()

    encoded = authorization.split(" ", 1)[1]
    try:
        decoded = base64.b64decode(encoded).decode("utf-8")
        username, password = decoded.split(":", 1)
    except Exception:
        return _auth_required_response()

    if not (
        secrets.compare_digest(username, settings.basic_auth_user)
        and secrets.compare_digest(password, settings.basic_auth_password)
    ):
        return _auth_required_response()
    return await call_next(request)


def _auth_required_response():
    from starlette.responses import Response

    return Response(
        status_code=401,
        headers={"WWW-Authenticate": "Basic"},
        content="Authentication required",
    )


@app.middleware("http")
async def endpoint_rate_limiter(request: Request, call_next):
    path = request.url.path
    if path.endswith("/health") or path.startswith("/docs") or path.startswith("/openapi"):
        return await call_next(request)

    capacity = float(settings.api_rate_limit_per_minute)
    refill_per_second = capacity / 60.0
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _request_buckets.get(key)
    if bucket is None:
        bucket = RequestBucket(tokens=capacity, last_refill=now)
        _request_buckets[key] = bucket

    elapsed = now - bucket.last_refill
    bucket.tokens = min(capacity, bucket.tokens + elapsed * refill_per_second)
    bucket.last_refill = now

    if bucket.tokens < 1.0:
        from starlette.responses import JSONResponse

        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please retry shortly."},
        )
    bucket.tokens -= 1.0
    return await call_next(request)


app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(market_router, prefix=settings.api_prefix)
app.include_router(screener_router, prefix=settings.api_prefix)
app.include_router(watchlist_router, prefix=settings.api_prefix)
app.include_router(portfolio_router, prefix=settings.api_prefix)
app.include_router(news_router, prefix=settings.api_prefix)
app.include_router(ai_router, prefix=settings.api_prefix)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": settings.app_name, "docs": "/docs"}

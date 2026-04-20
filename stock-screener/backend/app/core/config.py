from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_env: str
    api_prefix: str
    database_url: str
    cors_origins: tuple[str, ...]
    alpha_vantage_key: str
    run_scheduler_in_api: bool
    basic_auth_user: str | None
    basic_auth_password: str | None
    yfinance_hourly_limit: int
    alpha_vantage_minute_limit: int


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/stocks.db")
    if db_url.startswith("sqlite+aiosqlite:///./"):
        data_dir = Path(db_url.replace("sqlite+aiosqlite:///./", "")).parent
        data_dir.mkdir(parents=True, exist_ok=True)

    cors_value = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080",
    )
    cors_origins = tuple(origin.strip() for origin in cors_value.split(",") if origin.strip())

    return Settings(
        app_name=os.getenv("APP_NAME", "Lightweight Multi-Market Stock Screener"),
        app_env=os.getenv("APP_ENV", "dev"),
        api_prefix=os.getenv("API_PREFIX", "/api/v1"),
        database_url=db_url,
        cors_origins=cors_origins,
        alpha_vantage_key=os.getenv("ALPHA_VANTAGE_KEY", ""),
        run_scheduler_in_api=_parse_bool(os.getenv("RUN_SCHEDULER_IN_API"), default=False),
        basic_auth_user=os.getenv("BASIC_AUTH_USER"),
        basic_auth_password=os.getenv("BASIC_AUTH_PASSWORD"),
        yfinance_hourly_limit=int(os.getenv("YFINANCE_HOURLY_LIMIT", "2000")),
        alpha_vantage_minute_limit=int(os.getenv("ALPHA_VANTAGE_MINUTE_LIMIT", "5")),
    )


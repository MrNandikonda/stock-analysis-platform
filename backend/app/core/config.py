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
    run_scheduler_in_api: bool
    basic_auth_user: str | None
    basic_auth_password: str | None
    yfinance_hourly_limit: int
    api_rate_limit_per_minute: int
    ai_analysis_enabled: bool
    ai_default_provider: str
    ai_default_schedule_minutes: int
    ai_default_stale_after_minutes: int
    ai_max_stocks_per_job: int
    ai_max_parallel_agents: int
    ai_job_stale_minutes: int
    ai_web_search_enabled: bool
    ai_background_mode_enabled: bool
    openai_api_key: str | None
    openai_api_base_url: str | None
    openai_model_orchestrator: str
    openai_model_specialist: str
    openai_model_summarizer: str


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
        run_scheduler_in_api=_parse_bool(os.getenv("RUN_SCHEDULER_IN_API"), default=False),
        basic_auth_user=os.getenv("BASIC_AUTH_USER"),
        basic_auth_password=os.getenv("BASIC_AUTH_PASSWORD"),
        yfinance_hourly_limit=int(os.getenv("YFINANCE_HOURLY_LIMIT", "2000")),
        api_rate_limit_per_minute=int(os.getenv("API_RATE_LIMIT_PER_MINUTE", "120")),
        ai_analysis_enabled=_parse_bool(os.getenv("AI_ANALYSIS_ENABLED"), default=False),
        ai_default_provider=os.getenv("AI_DEFAULT_PROVIDER", "local-summary"),
        ai_default_schedule_minutes=int(os.getenv("AI_DEFAULT_SCHEDULE_MINUTES", "60")),
        ai_default_stale_after_minutes=int(os.getenv("AI_DEFAULT_STALE_AFTER_MINUTES", "180")),
        ai_max_stocks_per_job=int(os.getenv("AI_MAX_STOCKS_PER_JOB", "15")),
        ai_max_parallel_agents=int(os.getenv("AI_MAX_PARALLEL_AGENTS", "2")),
        ai_job_stale_minutes=int(os.getenv("AI_JOB_STALE_MINUTES", "90")),
        ai_web_search_enabled=_parse_bool(os.getenv("AI_WEB_SEARCH_ENABLED"), default=False),
        ai_background_mode_enabled=_parse_bool(os.getenv("AI_BACKGROUND_MODE_ENABLED"), default=False),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_api_base_url=os.getenv("OPENAI_API_BASE_URL"),
        openai_model_orchestrator=os.getenv("OPENAI_MODEL_ORCHESTRATOR", "gpt-5.4-mini"),
        openai_model_specialist=os.getenv("OPENAI_MODEL_SPECIALIST", "gpt-5.4-mini"),
        openai_model_summarizer=os.getenv("OPENAI_MODEL_SUMMARIZER", "gpt-5.4-mini"),
    )

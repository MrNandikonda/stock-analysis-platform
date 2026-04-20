from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIProviderConfig(Base):
    __tablename__ = "ai_provider_config"
    __table_args__ = (UniqueConstraint("provider_name", name="uq_ai_provider_config_provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_name: Mapped[str] = mapped_column(String(40), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    api_base_url: Mapped[str | None] = mapped_column(String(255), default=None)
    model_orchestrator: Mapped[str | None] = mapped_column(String(120), default=None)
    model_specialist: Mapped[str | None] = mapped_column(String(120), default=None)
    model_summarizer: Mapped[str | None] = mapped_column(String(120), default=None)
    extra_config_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIWatchlistSetting(Base):
    __tablename__ = "ai_watchlist_settings"
    __table_args__ = (UniqueConstraint("watchlist_id", name="uq_ai_watchlist_settings_watchlist"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("watchlists.id", ondelete="CASCADE"), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    cadence_minutes: Mapped[int] = mapped_column(Integer, default=60)
    categories_json: Mapped[str] = mapped_column(Text, default="[]")
    provider_name: Mapped[str] = mapped_column(String(40), default="openai")
    model_orchestrator_override: Mapped[str | None] = mapped_column(String(120), default=None)
    model_specialist_override: Mapped[str | None] = mapped_column(String(120), default=None)
    model_summarizer_override: Mapped[str | None] = mapped_column(String(120), default=None)
    max_stocks_per_job: Mapped[int] = mapped_column(Integer, default=20)
    max_parallel_agents: Mapped[int] = mapped_column(Integer, default=2)
    stale_after_minutes: Mapped[int] = mapped_column(Integer, default=180)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIAnalysisJob(Base):
    __tablename__ = "ai_analysis_jobs"
    __table_args__ = (
        Index("ix_ai_analysis_jobs_watchlist_status", "watchlist_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("watchlists.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    triggered_by: Mapped[str] = mapped_column(String(20), default="scheduler")
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    total_symbols: Mapped[int] = mapped_column(Integer, default=0)
    processed_symbols: Mapped[int] = mapped_column(Integer, default=0)
    failed_symbols: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, default=None)
    job_metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIAgentRun(Base):
    __tablename__ = "ai_agent_runs"
    __table_args__ = (
        Index("ix_ai_agent_runs_job_symbol", "job_id", "symbol"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("ai_analysis_jobs.id", ondelete="CASCADE"), index=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("watchlists.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    agent_name: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    duration_ms: Mapped[int | None] = mapped_column(Integer, default=None)
    confidence_score: Mapped[float | None] = mapped_column(Float, default=None)
    importance_score: Mapped[float | None] = mapped_column(Float, default=None)
    raw_score: Mapped[float | None] = mapped_column(Float, default=None)
    model_name: Mapped[str | None] = mapped_column(String(120), default=None)
    prompt_version: Mapped[str | None] = mapped_column(String(40), default=None)
    tokens_input: Mapped[int | None] = mapped_column(Integer, default=None)
    tokens_output: Mapped[int | None] = mapped_column(Integer, default=None)
    error_message: Mapped[str | None] = mapped_column(Text, default=None)
    output_json: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIStockAnalysis(Base):
    __tablename__ = "ai_stock_analysis"
    __table_args__ = (
        Index("ix_ai_stock_analysis_watchlist_symbol", "watchlist_id", "symbol"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("watchlists.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    job_id: Mapped[int | None] = mapped_column(ForeignKey("ai_analysis_jobs.id", ondelete="SET NULL"), default=None)
    overall_signal: Mapped[str] = mapped_column(String(20), index=True)
    overall_score: Mapped[float] = mapped_column(Float)
    confidence_score: Mapped[float] = mapped_column(Float)
    executive_summary: Mapped[str] = mapped_column(Text)
    thesis_bull: Mapped[str] = mapped_column(Text, default="")
    thesis_bear: Mapped[str] = mapped_column(Text, default="")
    near_term_risks_json: Mapped[str] = mapped_column(Text, default="[]")
    medium_term_risks_json: Mapped[str] = mapped_column(Text, default="[]")
    catalysts_json: Mapped[str] = mapped_column(Text, default="[]")
    regulation_impact: Mapped[str] = mapped_column(Text, default="")
    geo_political_impact: Mapped[str] = mapped_column(Text, default="")
    financial_health_summary: Mapped[str] = mapped_column(Text, default="")
    technical_summary: Mapped[str] = mapped_column(Text, default="")
    event_summary: Mapped[str] = mapped_column(Text, default="")
    options_summary: Mapped[str] = mapped_column(Text, default="")
    source_health_summary: Mapped[str] = mapped_column(Text, default="")
    stale_data_flags_json: Mapped[str] = mapped_column(Text, default="[]")
    citations_json: Mapped[str] = mapped_column(Text, default="[]")
    model_metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    agent_run_metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    is_latest: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class AIStockAnalysisFactor(Base):
    __tablename__ = "ai_stock_analysis_factors"
    __table_args__ = (
        Index("ix_ai_stock_analysis_factors_symbol_type", "symbol", "factor_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("ai_stock_analysis.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    category: Mapped[str] = mapped_column(String(60), index=True)
    factor_type: Mapped[str] = mapped_column(String(20), index=True)
    headline_summary: Mapped[str] = mapped_column(String(255))
    detail: Mapped[str] = mapped_column(Text)
    importance_score: Mapped[float | None] = mapped_column(Float, default=None)
    confidence_score: Mapped[float | None] = mapped_column(Float, default=None)
    raw_score: Mapped[float | None] = mapped_column(Float, default=None)
    source_ref: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIStockSourceRef(Base):
    __tablename__ = "ai_stock_source_refs"
    __table_args__ = (
        Index("ix_ai_stock_source_refs_symbol_type", "symbol", "source_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("ai_stock_analysis.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True)
    source_type: Mapped[str] = mapped_column(String(40), index=True)
    source_name: Mapped[str] = mapped_column(String(140))
    url: Mapped[str | None] = mapped_column(String(500), default=None)
    title: Mapped[str | None] = mapped_column(String(255), default=None)
    snippet: Mapped[str | None] = mapped_column(Text, default=None)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    freshness_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    reliability_score: Mapped[float | None] = mapped_column(Float, default=None)
    source_metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIAlertRule(Base):
    __tablename__ = "ai_alert_rules"
    __table_args__ = (UniqueConstraint("watchlist_id", "symbol", "rule_name", name="uq_ai_alert_rules_scope_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("watchlists.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str | None] = mapped_column(String(32), index=True, default=None)
    rule_name: Mapped[str] = mapped_column(String(120))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    condition_json: Mapped[str] = mapped_column(Text, default="{}")
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=60)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"
    __table_args__ = (
        Index("ix_ai_audit_logs_job_created", "job_id", "created_at"),
        Index("ix_ai_audit_logs_analysis_created", "analysis_id", "created_at"),
        Index("ix_ai_audit_logs_agent_created", "agent_name", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    watchlist_id: Mapped[int | None] = mapped_column(ForeignKey("watchlists.id", ondelete="SET NULL"), index=True, default=None)
    job_id: Mapped[int | None] = mapped_column(ForeignKey("ai_analysis_jobs.id", ondelete="SET NULL"), index=True, default=None)
    analysis_id: Mapped[int | None] = mapped_column(
        ForeignKey("ai_stock_analysis.id", ondelete="SET NULL"),
        index=True,
        default=None,
    )
    agent_name: Mapped[str | None] = mapped_column(String(80), index=True, default=None)
    log_level: Mapped[str] = mapped_column(String(16), default="info")
    event_type: Mapped[str] = mapped_column(String(60), index=True)
    message: Mapped[str] = mapped_column(Text)
    safe_payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

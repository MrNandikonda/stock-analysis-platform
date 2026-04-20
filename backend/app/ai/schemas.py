from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


AIAnalysisCategory = Literal[
    "news_intel",
    "geopolitical_risk",
    "regulation",
    "fundamentals",
    "technicals",
    "earnings_events",
    "options_flow",
    "macro_sector",
    "portfolio_impact",
    "source_health",
    "webapp_ops",
]
AIOverallSignal = Literal["strong_bearish", "bearish", "neutral", "bullish", "strong_bullish"]
FactorType = Literal["bullish", "bearish", "neutral", "risk", "catalyst", "stale"]

ALL_AGENT_CATEGORIES: tuple[AIAnalysisCategory, ...] = (
    "news_intel",
    "geopolitical_risk",
    "regulation",
    "fundamentals",
    "technicals",
    "earnings_events",
    "options_flow",
    "macro_sector",
    "portfolio_impact",
    "source_health",
    "webapp_ops",
)
DEFAULT_STOCK_AGENT_CATEGORIES: tuple[AIAnalysisCategory, ...] = (
    "news_intel",
    "fundamentals",
    "technicals",
    "earnings_events",
    "options_flow",
    "macro_sector",
    "portfolio_impact",
    "source_health",
)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceRef(StrictModel):
    source_type: str = Field(min_length=1, max_length=40)
    source_name: str = Field(min_length=1, max_length=140)
    url: str | None = Field(default=None, max_length=500)
    title: str | None = Field(default=None, max_length=255)
    snippet: str | None = None
    published_at: str | None = None
    fetched_at: str | None = None
    freshness_minutes: int | None = Field(default=None, ge=0)
    reliability_score: float | None = Field(default=None, ge=0, le=1)
    source_metadata: dict[str, Any] = Field(default_factory=dict)


class FactorItem(StrictModel):
    category: AIAnalysisCategory | str
    factor_type: FactorType
    headline_summary: str = Field(min_length=1, max_length=255)
    detail: str = Field(min_length=1)
    importance_score: float = Field(default=50, ge=0, le=100)
    confidence_score: float = Field(default=0.5, ge=0, le=1)
    raw_score: float = Field(default=0, ge=-100, le=100)
    source_ref: str | None = Field(default=None, max_length=255)


class SpecialistOutput(StrictModel):
    symbol: str = Field(min_length=1, max_length=32)
    market: str = Field(min_length=1, max_length=12)
    category: AIAnalysisCategory
    headline_summary: str = Field(min_length=1)
    bullish_factors: list[str] = Field(default_factory=list)
    bearish_factors: list[str] = Field(default_factory=list)
    neutral_factors: list[str] = Field(default_factory=list)
    confidence_score: float = Field(ge=0, le=1)
    importance_score: float = Field(ge=0, le=100)
    freshness_minutes: int | None = Field(default=None, ge=0)
    source_refs: list[SourceRef] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    raw_score: float = Field(ge=-100, le=100)
    insufficient_evidence: bool = False
    model_metadata: dict[str, Any] = Field(default_factory=dict)


class AggregatedAnalysis(StrictModel):
    symbol: str = Field(min_length=1, max_length=32)
    watchlist_id: int = Field(ge=1)
    overall_signal: AIOverallSignal
    overall_score: float = Field(ge=-100, le=100)
    confidence_score: float = Field(ge=0, le=1)
    executive_summary: str = Field(min_length=1)
    thesis_bull: str = ""
    thesis_bear: str = ""
    near_term_risks: list[str] = Field(default_factory=list)
    medium_term_risks: list[str] = Field(default_factory=list)
    catalysts: list[str] = Field(default_factory=list)
    regulation_impact: str = ""
    geo_political_impact: str = ""
    financial_health_summary: str = ""
    technical_summary: str = ""
    event_summary: str = ""
    options_summary: str = ""
    source_health_summary: str = ""
    stale_data_flags: list[str] = Field(default_factory=list)
    citations: list[SourceRef] = Field(default_factory=list)
    model_metadata: dict[str, Any] = Field(default_factory=dict)
    agent_run_metadata: dict[str, Any] = Field(default_factory=dict)
    factors: list[FactorItem] = Field(default_factory=list)
    source_refs: list[SourceRef] = Field(default_factory=list)


class AIWatchlistSettingsPayload(StrictModel):
    enabled: bool = False
    cadence_minutes: int = Field(default=60, ge=5, le=1440)
    categories: list[AIAnalysisCategory] = Field(default_factory=lambda: list(DEFAULT_STOCK_AGENT_CATEGORIES))
    provider_name: str = Field(default="local-summary", min_length=1, max_length=40)
    model_orchestrator_override: str | None = Field(default=None, max_length=120)
    model_specialist_override: str | None = Field(default=None, max_length=120)
    model_summarizer_override: str | None = Field(default=None, max_length=120)
    max_stocks_per_job: int = Field(default=15, ge=1, le=100)
    max_parallel_agents: int = Field(default=2, ge=1, le=8)
    stale_after_minutes: int = Field(default=180, ge=15, le=1440)


class AIRunRequest(StrictModel):
    force: bool = False


class AIProviderStatus(StrictModel):
    provider_name: str
    enabled: bool
    ready: bool
    status: str
    message: str
    model_orchestrator: str | None = None
    model_specialist: str | None = None
    model_summarizer: str | None = None
    supports_tool_calling: bool = False
    supports_background_mode: bool = False


class AIStatusResponse(StrictModel):
    ai_analysis_enabled: bool
    default_provider: str
    background_mode_enabled: bool
    web_search_enabled: bool
    available_categories: list[AIAnalysisCategory]
    providers: list[AIProviderStatus]


class AIJobSummary(StrictModel):
    id: int
    watchlist_id: int
    status: str
    triggered_by: str
    total_symbols: int
    processed_symbols: int
    failed_symbols: int
    retry_count: int
    error_message: str | None = None
    created_at: str
    started_at: str | None = None
    finished_at: str | None = None


class AIAnalysisListItem(StrictModel):
    symbol: str
    overall_signal: AIOverallSignal
    overall_score: float
    confidence_score: float
    executive_summary: str
    stale_data_flags: list[str] = Field(default_factory=list)
    created_at: str
    expires_at: str | None = None


class AIAnalysisDelta(StrictModel):
    previous_signal: AIOverallSignal | None = None
    score_change: float | None = None
    confidence_change: float | None = None
    changed: bool = False
    why_changed: list[str] = Field(default_factory=list)


class AIStockAnalysisDetail(StrictModel):
    symbol: str
    watchlist_id: int
    analysis: AggregatedAnalysis
    previous_delta: AIAnalysisDelta
    created_at: str
    expires_at: str | None = None


class AIWatchlistSummary(StrictModel):
    watchlist_id: int
    watchlist_name: str
    enabled: bool
    provider_name: str
    overall_sentiment: AIOverallSignal | Literal["no_data"]
    average_score: float | None = None
    average_confidence: float | None = None
    last_run_time: str | None = None
    next_run_time: str | None = None
    top_bullish_names: list[str] = Field(default_factory=list)
    top_bearish_names: list[str] = Field(default_factory=list)
    stale_data_warning: bool = False
    stale_symbols: list[str] = Field(default_factory=list)
    latest_analyses: list[AIAnalysisListItem] = Field(default_factory=list)


class AIDiagnosticsResponse(StrictModel):
    providers: list[AIProviderStatus]
    recent_jobs: list[AIJobSummary] = Field(default_factory=list)
    recent_failures: list[AIJobSummary] = Field(default_factory=list)
    average_run_duration_ms: float | None = None
    token_summary: dict[str, int] = Field(default_factory=dict)
    source_health: dict[str, Any] = Field(default_factory=dict)
    safety_mode: dict[str, Any] = Field(default_factory=dict)
    admin_summary: str = ""


def normalize_categories(categories: list[str] | None) -> list[AIAnalysisCategory]:
    if not categories:
        return list(DEFAULT_STOCK_AGENT_CATEGORIES)
    allowed = set(ALL_AGENT_CATEGORIES)
    normalized: list[AIAnalysisCategory] = []
    for value in categories:
        if value in allowed:
            normalized.append(value)
    return normalized or list(DEFAULT_STOCK_AGENT_CATEGORIES)

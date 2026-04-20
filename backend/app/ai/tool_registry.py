from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel, Field

from app.ai.providers import ProviderTool
from app.ai.schemas import AggregatedAnalysis
from app.ai.services.data_access_service import AIDataAccessService
from app.ai.services.persistence_service import AIPersistenceService


@dataclass(slots=True)
class AIToolContext:
    watchlist_id: int
    symbol: str | None
    data_access: AIDataAccessService
    persistence: AIPersistenceService
    job_id: int | None = None
    allow_write_tools: bool = False


class WatchlistArgs(BaseModel):
    watchlist_id: int = Field(ge=1)


class SymbolArgs(BaseModel):
    symbol: str


class SymbolLimitArgs(BaseModel):
    symbol: str
    limit: int = Field(default=6, ge=1, le=20)


class SaveAnalysisArgs(BaseModel):
    analysis: AggregatedAnalysis


class SaveAlertArgs(BaseModel):
    watchlist_id: int = Field(ge=1)
    rule_name: str
    symbol: str | None = None
    severity: str = "medium"
    cooldown_minutes: int = Field(default=60, ge=0, le=1440)
    condition: dict[str, Any] = Field(default_factory=dict)


class AuditLogArgs(BaseModel):
    event_type: str
    message: str
    log_level: str = "info"
    safe_payload: dict[str, Any] = Field(default_factory=dict)


def build_tool_registry(context: AIToolContext) -> dict[str, ProviderTool]:
    async def get_watchlist_handler(args: dict[str, Any]) -> Any:
        parsed = WatchlistArgs.model_validate(args)
        return await context.data_access.get_watchlist(parsed.watchlist_id)

    async def get_stock_snapshot_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolArgs.model_validate(args)
        return await context.data_access.get_stock_snapshot(parsed.symbol)

    async def get_price_history_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolLimitArgs.model_validate(args)
        return await context.data_access.get_price_history(parsed.symbol, limit=parsed.limit)

    async def get_fundamentals_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolArgs.model_validate(args)
        return await context.data_access.get_fundamentals(parsed.symbol)

    async def get_news_items_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolLimitArgs.model_validate(args)
        return await context.data_access.get_news_items(parsed.symbol, limit=parsed.limit)

    async def get_options_snapshot_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolArgs.model_validate(args)
        return await context.data_access.get_options_snapshot(parsed.symbol)

    async def get_earnings_events_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolArgs.model_validate(args)
        return await context.data_access.get_earnings_events(parsed.symbol)

    async def get_regulatory_notes_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolArgs.model_validate(args)
        return await context.data_access.get_regulatory_notes(parsed.symbol)

    async def get_sector_context_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolArgs.model_validate(args)
        return await context.data_access.get_sector_context(parsed.symbol)

    async def get_source_health_handler(args: dict[str, Any]) -> Any:
        parsed = SymbolArgs.model_validate(args)
        return await context.data_access.get_source_health(parsed.symbol)

    async def save_analysis_result_handler(args: dict[str, Any]) -> Any:
        if not context.allow_write_tools:
            return {"saved": False, "reason": "write_tools_disabled"}
        parsed = SaveAnalysisArgs.model_validate(args)
        analysis = parsed.analysis
        row = await context.persistence.save_stock_analysis(
            watchlist_id=analysis.watchlist_id,
            symbol=analysis.symbol,
            overall_signal=analysis.overall_signal,
            overall_score=analysis.overall_score,
            confidence_score=analysis.confidence_score,
            executive_summary=analysis.executive_summary,
            job_id=context.job_id,
            thesis_bull=analysis.thesis_bull,
            thesis_bear=analysis.thesis_bear,
            near_term_risks=analysis.near_term_risks,
            medium_term_risks=analysis.medium_term_risks,
            catalysts=analysis.catalysts,
            regulation_impact=analysis.regulation_impact,
            geo_political_impact=analysis.geo_political_impact,
            financial_health_summary=analysis.financial_health_summary,
            technical_summary=analysis.technical_summary,
            event_summary=analysis.event_summary,
            options_summary=analysis.options_summary,
            source_health_summary=analysis.source_health_summary,
            stale_data_flags=analysis.stale_data_flags,
            citations=[source.model_dump(mode="json") for source in analysis.citations],
            model_metadata=analysis.model_metadata,
            agent_run_metadata=analysis.agent_run_metadata,
            expires_at=datetime.now(UTC) + timedelta(minutes=180),
            factors=[factor.model_dump(mode="json") for factor in analysis.factors],
            source_refs=[source.model_dump(mode="json") for source in analysis.source_refs],
        )
        return {"saved": True, "analysis_id": row.id}

    async def save_alert_handler(args: dict[str, Any]) -> Any:
        if not context.allow_write_tools:
            return {"saved": False, "reason": "write_tools_disabled"}
        parsed = SaveAlertArgs.model_validate(args)
        rule = await context.persistence.upsert_alert_rule(
            watchlist_id=parsed.watchlist_id,
            rule_name=parsed.rule_name,
            symbol=parsed.symbol,
            severity=parsed.severity,
            cooldown_minutes=parsed.cooldown_minutes,
            condition=parsed.condition,
        )
        return {"saved": True, "alert_rule_id": rule.id}

    async def append_agent_audit_log_handler(args: dict[str, Any]) -> Any:
        if not context.allow_write_tools:
            return {"saved": False, "reason": "write_tools_disabled"}
        parsed = AuditLogArgs.model_validate(args)
        row = await context.persistence.append_audit_log(
            event_type=parsed.event_type,
            message=parsed.message,
            watchlist_id=context.watchlist_id,
            job_id=context.job_id,
            log_level=parsed.log_level,
            safe_payload=parsed.safe_payload,
        )
        return {"saved": True, "audit_log_id": row.id}

    return {
        "get_watchlist": ProviderTool(
            name="get_watchlist",
            description="Get the watchlist name and current symbols for a watchlist id.",
            parameters_schema=WatchlistArgs.model_json_schema(),
            handler=get_watchlist_handler,
        ),
        "get_stock_snapshot": ProviderTool(
            name="get_stock_snapshot",
            description="Get the latest stock snapshot, price metrics, and lightweight context for a symbol.",
            parameters_schema=SymbolArgs.model_json_schema(),
            handler=get_stock_snapshot_handler,
        ),
        "get_price_history": ProviderTool(
            name="get_price_history",
            description="Get recent OHLCV price history for a symbol.",
            parameters_schema=SymbolLimitArgs.model_json_schema(),
            handler=get_price_history_handler,
        ),
        "get_fundamentals": ProviderTool(
            name="get_fundamentals",
            description="Get the latest stored fundamentals for a symbol.",
            parameters_schema=SymbolArgs.model_json_schema(),
            handler=get_fundamentals_handler,
        ),
        "get_news_items": ProviderTool(
            name="get_news_items",
            description="Get recent news items for a symbol.",
            parameters_schema=SymbolLimitArgs.model_json_schema(),
            handler=get_news_items_handler,
        ),
        "get_options_snapshot": ProviderTool(
            name="get_options_snapshot",
            description="Get a lightweight options and derivatives snapshot for a symbol.",
            parameters_schema=SymbolArgs.model_json_schema(),
            handler=get_options_snapshot_handler,
        ),
        "get_earnings_events": ProviderTool(
            name="get_earnings_events",
            description="Get near-term earnings or event dates for a symbol.",
            parameters_schema=SymbolArgs.model_json_schema(),
            handler=get_earnings_events_handler,
        ),
        "get_regulatory_notes": ProviderTool(
            name="get_regulatory_notes",
            description="Get market-specific regulatory notes for a symbol.",
            parameters_schema=SymbolArgs.model_json_schema(),
            handler=get_regulatory_notes_handler,
        ),
        "get_sector_context": ProviderTool(
            name="get_sector_context",
            description="Get peer and sector context for a symbol.",
            parameters_schema=SymbolArgs.model_json_schema(),
            handler=get_sector_context_handler,
        ),
        "get_source_health": ProviderTool(
            name="get_source_health",
            description="Get source freshness and staleness metrics for a symbol.",
            parameters_schema=SymbolArgs.model_json_schema(),
            handler=get_source_health_handler,
        ),
        "save_analysis_result": ProviderTool(
            name="save_analysis_result",
            description="Save a fully synthesized stock analysis result.",
            parameters_schema=SaveAnalysisArgs.model_json_schema(),
            handler=save_analysis_result_handler,
            read_only=False,
        ),
        "save_alert": ProviderTool(
            name="save_alert",
            description="Save or update an AI-driven alert rule.",
            parameters_schema=SaveAlertArgs.model_json_schema(),
            handler=save_alert_handler,
            read_only=False,
        ),
        "append_agent_audit_log": ProviderTool(
            name="append_agent_audit_log",
            description="Append a concise AI audit log entry.",
            parameters_schema=AuditLogArgs.model_json_schema(),
            handler=append_agent_audit_log_handler,
            read_only=False,
        ),
    }


def select_tools(context: AIToolContext, names: list[str]) -> list[ProviderTool]:
    registry = build_tool_registry(context)
    tools: list[ProviderTool] = []
    for name in names:
        tool = registry.get(name)
        if tool is None:
            continue
        if not context.allow_write_tools and not tool.read_only:
            continue
        tools.append(tool)
    return tools

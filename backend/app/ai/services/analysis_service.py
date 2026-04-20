from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents import WebAppOpsAgent
from app.ai.orchestrator import AIWatchlistOrchestrator
from app.ai.schemas import (
    AIAnalysisDelta,
    AIAnalysisListItem,
    AIDiagnosticsResponse,
    AIJobSummary,
    AIStockAnalysisDetail,
    AIWatchlistSettingsPayload,
    AIWatchlistSummary,
    AggregatedAnalysis,
    FactorItem,
    SourceRef,
    normalize_categories,
)
from app.ai.services.config_service import AIConfigService
from app.ai.services.persistence_service import AIPersistenceService
from app.core.config import get_settings
from app.models.ai_entities import AIAgentRun, AIAnalysisJob, AIStockAnalysis, AIStockAnalysisFactor, AIStockSourceRef
from app.models.entities import Watchlist


class AIAnalysisService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = get_settings()
        self.persistence = AIPersistenceService(session)
        self.config_service = AIConfigService(session)
        self.orchestrator = AIWatchlistOrchestrator(session)

    async def get_status(self) -> dict[str, Any]:
        return (await self.config_service.get_status_response()).model_dump(mode="json")

    async def get_watchlist_settings(self, watchlist_id: int) -> dict[str, Any]:
        await self._ensure_watchlist_exists(watchlist_id)
        setting = await self.persistence.get_watchlist_setting(watchlist_id)
        if setting is None:
            resolved = await self.config_service.resolve_provider()
            payload = AIWatchlistSettingsPayload(
                enabled=False,
                cadence_minutes=self.settings.ai_default_schedule_minutes,
                categories=normalize_categories(None),
                provider_name=resolved.provider_name,
                max_stocks_per_job=self.settings.ai_max_stocks_per_job,
                max_parallel_agents=self.settings.ai_max_parallel_agents,
                stale_after_minutes=self.settings.ai_default_stale_after_minutes,
            )
        else:
            payload = AIWatchlistSettingsPayload(
                enabled=setting.enabled,
                cadence_minutes=setting.cadence_minutes,
                categories=normalize_categories(_json_list(setting.categories_json)),
                provider_name=setting.provider_name,
                model_orchestrator_override=setting.model_orchestrator_override,
                model_specialist_override=setting.model_specialist_override,
                model_summarizer_override=setting.model_summarizer_override,
                max_stocks_per_job=setting.max_stocks_per_job,
                max_parallel_agents=setting.max_parallel_agents,
                stale_after_minutes=setting.stale_after_minutes,
            )
        return payload.model_dump(mode="json")

    async def update_watchlist_settings(self, watchlist_id: int, payload: AIWatchlistSettingsPayload) -> dict[str, Any]:
        await self._ensure_watchlist_exists(watchlist_id)
        next_run_at = datetime.now(UTC) if payload.enabled else None
        setting = await self.persistence.upsert_watchlist_setting(
            watchlist_id,
            enabled=payload.enabled,
            cadence_minutes=payload.cadence_minutes,
            categories=normalize_categories(payload.categories),
            provider_name=payload.provider_name,
            model_orchestrator_override=payload.model_orchestrator_override,
            model_specialist_override=payload.model_specialist_override,
            model_summarizer_override=payload.model_summarizer_override,
            max_stocks_per_job=payload.max_stocks_per_job,
            max_parallel_agents=payload.max_parallel_agents,
            stale_after_minutes=payload.stale_after_minutes,
            next_run_at=next_run_at,
        )
        return {
            "watchlist_id": watchlist_id,
            "enabled": setting.enabled,
            "next_run_at": setting.next_run_at.isoformat() if setting.next_run_at else None,
        }

    async def run_watchlist_now(self, watchlist_id: int, force: bool = False) -> dict[str, Any]:
        await self._ensure_watchlist_exists(watchlist_id)
        return await self.orchestrator.run_watchlist_analysis(watchlist_id, triggered_by="manual", force=force)

    async def get_watchlist_summary(self, watchlist_id: int) -> dict[str, Any]:
        watchlist = await self._ensure_watchlist_exists(watchlist_id)
        analyses = await self.persistence.list_latest_watchlist_analyses(watchlist_id, limit=50)
        setting = await self.persistence.get_watchlist_setting(watchlist_id)
        items = [self._serialize_analysis_item(row) for row in analyses]

        scores = [row.overall_score for row in analyses]
        confidences = [row.confidence_score for row in analyses]
        top_bullish = [row.symbol for row in sorted(analyses, key=lambda item: item.overall_score, reverse=True)[:3]]
        top_bearish = [row.symbol for row in sorted(analyses, key=lambda item: item.overall_score)[:3]]
        stale_symbols = [row.symbol for row in analyses if _json_list(row.stale_data_flags_json)]
        average_score = round(sum(scores) / len(scores), 3) if scores else None

        summary = AIWatchlistSummary(
            watchlist_id=watchlist_id,
            watchlist_name=watchlist.name,
            enabled=bool(setting.enabled) if setting else False,
            provider_name=setting.provider_name if setting else self.settings.ai_default_provider,
            overall_sentiment="no_data" if average_score is None else _score_to_signal(average_score),
            average_score=average_score,
            average_confidence=round(sum(confidences) / len(confidences), 3) if confidences else None,
            last_run_time=setting.last_run_at.isoformat() if setting and setting.last_run_at else None,
            next_run_time=setting.next_run_at.isoformat() if setting and setting.next_run_at else None,
            top_bullish_names=top_bullish,
            top_bearish_names=top_bearish,
            stale_data_warning=bool(stale_symbols),
            stale_symbols=stale_symbols,
            latest_analyses=items,
        )
        return summary.model_dump(mode="json")

    async def list_watchlist_analyses(self, watchlist_id: int) -> list[dict[str, Any]]:
        await self._ensure_watchlist_exists(watchlist_id)
        analyses = await self.persistence.list_latest_watchlist_analyses(watchlist_id, limit=100)
        return [self._serialize_analysis_item(row).model_dump(mode="json") for row in analyses]

    async def get_stock_analysis_detail(self, watchlist_id: int, symbol: str) -> dict[str, Any]:
        await self._ensure_watchlist_exists(watchlist_id)
        normalized_symbol = symbol.upper()
        analyses = (
            await self.session.execute(
                select(AIStockAnalysis)
                .where(AIStockAnalysis.watchlist_id == watchlist_id, AIStockAnalysis.symbol == normalized_symbol)
                .order_by(AIStockAnalysis.created_at.desc())
                .limit(2)
            )
        ).scalars().all()
        if not analyses:
            raise ValueError("Analysis not found")

        latest = analyses[0]
        previous = analyses[1] if len(analyses) > 1 else None
        factors = (
            await self.session.execute(
                select(AIStockAnalysisFactor)
                .where(AIStockAnalysisFactor.analysis_id == latest.id)
                .order_by(AIStockAnalysisFactor.created_at.asc())
            )
        ).scalars().all()
        source_refs = (
            await self.session.execute(
                select(AIStockSourceRef)
                .where(AIStockSourceRef.analysis_id == latest.id)
                .order_by(AIStockSourceRef.created_at.asc())
            )
        ).scalars().all()
        analysis = self._analysis_row_to_model(latest, factors, source_refs)
        delta = self._build_delta(latest, previous)
        detail = AIStockAnalysisDetail(
            symbol=normalized_symbol,
            watchlist_id=watchlist_id,
            analysis=analysis,
            previous_delta=delta,
            created_at=latest.created_at.isoformat(),
            expires_at=latest.expires_at.isoformat() if latest.expires_at else None,
        )
        return detail.model_dump(mode="json")

    async def get_diagnostics(self) -> dict[str, Any]:
        provider_statuses = await self.config_service.list_provider_statuses()
        recent_jobs = (
            await self.session.execute(select(AIAnalysisJob).order_by(AIAnalysisJob.created_at.desc()).limit(12))
        ).scalars().all()
        recent_failures = [job for job in recent_jobs if job.status in {"failed", "stale"}][:6]
        agent_runs = (
            await self.session.execute(select(AIAgentRun).order_by(AIAgentRun.created_at.desc()).limit(100))
        ).scalars().all()
        latest_analyses = (
            await self.session.execute(
                select(AIStockAnalysis).where(AIStockAnalysis.is_latest.is_(True)).order_by(AIStockAnalysis.created_at.desc()).limit(100)
            )
        ).scalars().all()

        durations = [
            (job.finished_at - job.started_at).total_seconds() * 1000
            for job in recent_jobs
            if job.started_at and job.finished_at
        ]
        token_summary = {
            "input_tokens": sum(run.tokens_input or 0 for run in agent_runs),
            "output_tokens": sum(run.tokens_output or 0 for run in agent_runs),
        }
        source_health = {
            "latest_analyses_count": len(latest_analyses),
            "stale_analysis_count": sum(1 for row in latest_analyses if _json_list(row.stale_data_flags_json)),
            "expired_analysis_count": sum(1 for row in latest_analyses if row.expires_at and row.expires_at < datetime.now(UTC).replace(tzinfo=None)),
        }
        safety_mode = {
            "write_tools_enabled_for_specialists": False,
            "web_search_enabled": self.settings.ai_web_search_enabled,
            "background_mode_enabled": self.settings.ai_background_mode_enabled,
        }
        diagnostics = {
            "recent_jobs": [self._serialize_job(job).model_dump(mode="json") for job in recent_jobs[:8]],
            "recent_failures": [self._serialize_job(job).model_dump(mode="json") for job in recent_failures],
        }
        admin_summary = WebAppOpsAgent().summarize(diagnostics, [status.message for status in provider_statuses])
        response = AIDiagnosticsResponse(
            providers=provider_statuses,
            recent_jobs=[self._serialize_job(job) for job in recent_jobs[:8]],
            recent_failures=[self._serialize_job(job) for job in recent_failures],
            average_run_duration_ms=round(sum(durations) / len(durations), 3) if durations else None,
            token_summary=token_summary,
            source_health=source_health,
            safety_mode=safety_mode,
            admin_summary=admin_summary,
        )
        return response.model_dump(mode="json")

    def _serialize_analysis_item(self, row: AIStockAnalysis) -> AIAnalysisListItem:
        return AIAnalysisListItem(
            symbol=row.symbol,
            overall_signal=row.overall_signal,
            overall_score=row.overall_score,
            confidence_score=row.confidence_score,
            executive_summary=row.executive_summary,
            stale_data_flags=_json_list(row.stale_data_flags_json),
            created_at=row.created_at.isoformat(),
            expires_at=row.expires_at.isoformat() if row.expires_at else None,
        )

    def _serialize_job(self, job: AIAnalysisJob) -> AIJobSummary:
        return AIJobSummary(
            id=job.id,
            watchlist_id=job.watchlist_id,
            status=job.status,
            triggered_by=job.triggered_by,
            total_symbols=job.total_symbols,
            processed_symbols=job.processed_symbols,
            failed_symbols=job.failed_symbols,
            retry_count=job.retry_count,
            error_message=job.error_message,
            created_at=job.created_at.isoformat(),
            started_at=job.started_at.isoformat() if job.started_at else None,
            finished_at=job.finished_at.isoformat() if job.finished_at else None,
        )

    def _analysis_row_to_model(
        self,
        row: AIStockAnalysis,
        factors: list[AIStockAnalysisFactor],
        source_refs: list[AIStockSourceRef],
    ) -> AggregatedAnalysis:
        return AggregatedAnalysis(
            symbol=row.symbol,
            watchlist_id=row.watchlist_id,
            overall_signal=row.overall_signal,
            overall_score=row.overall_score,
            confidence_score=row.confidence_score,
            executive_summary=row.executive_summary,
            thesis_bull=row.thesis_bull,
            thesis_bear=row.thesis_bear,
            near_term_risks=_json_list(row.near_term_risks_json),
            medium_term_risks=_json_list(row.medium_term_risks_json),
            catalysts=_json_list(row.catalysts_json),
            regulation_impact=row.regulation_impact,
            geo_political_impact=row.geo_political_impact,
            financial_health_summary=row.financial_health_summary,
            technical_summary=row.technical_summary,
            event_summary=row.event_summary,
            options_summary=row.options_summary,
            source_health_summary=row.source_health_summary,
            stale_data_flags=_json_list(row.stale_data_flags_json),
            citations=[SourceRef.model_validate(item) for item in _json_object_list(row.citations_json)],
            model_metadata=_json_dict(row.model_metadata_json),
            agent_run_metadata=_json_dict(row.agent_run_metadata_json),
            factors=[
                FactorItem(
                    category=factor.category,
                    factor_type=factor.factor_type,
                    headline_summary=factor.headline_summary,
                    detail=factor.detail,
                    importance_score=factor.importance_score or 0,
                    confidence_score=factor.confidence_score or 0,
                    raw_score=factor.raw_score or 0,
                    source_ref=factor.source_ref,
                )
                for factor in factors
            ],
            source_refs=[
                SourceRef(
                    source_type=source_ref.source_type,
                    source_name=source_ref.source_name,
                    url=source_ref.url,
                    title=source_ref.title,
                    snippet=source_ref.snippet,
                    published_at=source_ref.published_at.isoformat() if source_ref.published_at else None,
                    fetched_at=source_ref.fetched_at.isoformat() if source_ref.fetched_at else None,
                    freshness_minutes=source_ref.freshness_minutes,
                    reliability_score=source_ref.reliability_score,
                    source_metadata=_json_dict(source_ref.source_metadata_json),
                )
                for source_ref in source_refs
            ],
        )

    def _build_delta(self, latest: AIStockAnalysis, previous: AIStockAnalysis | None) -> AIAnalysisDelta:
        if previous is None:
            return AIAnalysisDelta(changed=False, why_changed=["No previous run is available for comparison."])

        why_changed: list[str] = []
        if latest.overall_signal != previous.overall_signal:
            why_changed.append("Overall signal changed between runs.")
        score_change = round(latest.overall_score - previous.overall_score, 3)
        confidence_change = round(latest.confidence_score - previous.confidence_score, 3)
        if abs(score_change) >= 8:
            why_changed.append("Overall score moved materially.")
        latest_stale = set(_json_list(latest.stale_data_flags_json))
        previous_stale = set(_json_list(previous.stale_data_flags_json))
        if latest_stale != previous_stale:
            why_changed.append("Source freshness flags changed.")

        return AIAnalysisDelta(
            previous_signal=previous.overall_signal,
            score_change=score_change,
            confidence_change=confidence_change,
            changed=bool(why_changed),
            why_changed=why_changed or ["No material change detected."],
        )

    async def _ensure_watchlist_exists(self, watchlist_id: int) -> Watchlist:
        watchlist = (await self.session.execute(select(Watchlist).where(Watchlist.id == watchlist_id))).scalar_one_or_none()
        if watchlist is None:
            raise ValueError("Watchlist not found")
        return watchlist


def _json_dict(raw_value: str | None) -> dict[str, Any]:
    if not raw_value:
        return {}
    try:
        payload = json.loads(raw_value)
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}


def _json_list(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    try:
        payload = json.loads(raw_value)
        return payload if isinstance(payload, list) else []
    except json.JSONDecodeError:
        return []


def _json_object_list(raw_value: str | None) -> list[dict[str, Any]]:
    if not raw_value:
        return []
    try:
        payload = json.loads(raw_value)
        return payload if isinstance(payload, list) else []
    except json.JSONDecodeError:
        return []


def _score_to_signal(score: float) -> str:
    if score >= 45:
        return "strong_bullish"
    if score >= 15:
        return "bullish"
    if score <= -45:
        return "strong_bearish"
    if score <= -15:
        return "bearish"
    return "neutral"

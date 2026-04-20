from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_entities import (
    AIAgentRun,
    AIAlertRule,
    AIAnalysisJob,
    AIAuditLog,
    AIStockAnalysis,
    AIStockAnalysisFactor,
    AIStockSourceRef,
    AIWatchlistSetting,
)


class AIPersistenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_watchlist_setting(self, watchlist_id: int) -> AIWatchlistSetting | None:
        return (
            await self.session.execute(
                select(AIWatchlistSetting).where(AIWatchlistSetting.watchlist_id == watchlist_id)
            )
        ).scalar_one_or_none()

    async def list_enabled_watchlist_settings(self) -> list[AIWatchlistSetting]:
        return (
            await self.session.execute(
                select(AIWatchlistSetting)
                .where(AIWatchlistSetting.enabled.is_(True))
                .order_by(AIWatchlistSetting.next_run_at.is_not(None), AIWatchlistSetting.next_run_at.asc())
            )
        ).scalars().all()

    async def upsert_watchlist_setting(
        self,
        watchlist_id: int,
        *,
        enabled: bool,
        cadence_minutes: int,
        categories: list[str],
        provider_name: str = "openai",
        model_orchestrator_override: str | None = None,
        model_specialist_override: str | None = None,
        model_summarizer_override: str | None = None,
        max_stocks_per_job: int = 20,
        max_parallel_agents: int = 2,
        stale_after_minutes: int = 180,
        next_run_at: datetime | None = None,
    ) -> AIWatchlistSetting:
        existing = await self.get_watchlist_setting(watchlist_id)
        now = _utc_now_naive()
        if existing:
            existing.enabled = enabled
            existing.cadence_minutes = cadence_minutes
            existing.categories_json = _dump_json(categories)
            existing.provider_name = provider_name
            existing.model_orchestrator_override = model_orchestrator_override
            existing.model_specialist_override = model_specialist_override
            existing.model_summarizer_override = model_summarizer_override
            existing.max_stocks_per_job = max_stocks_per_job
            existing.max_parallel_agents = max_parallel_agents
            existing.stale_after_minutes = stale_after_minutes
            existing.next_run_at = _to_naive(next_run_at)
            existing.updated_at = now
            setting = existing
        else:
            setting = AIWatchlistSetting(
                watchlist_id=watchlist_id,
                enabled=enabled,
                cadence_minutes=cadence_minutes,
                categories_json=_dump_json(categories),
                provider_name=provider_name,
                model_orchestrator_override=model_orchestrator_override,
                model_specialist_override=model_specialist_override,
                model_summarizer_override=model_summarizer_override,
                max_stocks_per_job=max_stocks_per_job,
                max_parallel_agents=max_parallel_agents,
                stale_after_minutes=stale_after_minutes,
                next_run_at=_to_naive(next_run_at),
                created_at=now,
                updated_at=now,
            )
            self.session.add(setting)

        await self.session.flush()
        return setting

    async def create_analysis_job(
        self,
        watchlist_id: int,
        *,
        triggered_by: str = "scheduler",
        scheduled_for: datetime | None = None,
        total_symbols: int = 0,
        job_metadata: dict[str, Any] | None = None,
    ) -> AIAnalysisJob:
        now = _utc_now_naive()
        job = AIAnalysisJob(
            watchlist_id=watchlist_id,
            status="pending",
            triggered_by=triggered_by,
            scheduled_for=_to_naive(scheduled_for),
            total_symbols=total_symbols,
            job_metadata_json=_dump_json(job_metadata or {}),
            created_at=now,
            updated_at=now,
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_analysis_job(self, job_id: int) -> AIAnalysisJob | None:
        return (await self.session.execute(select(AIAnalysisJob).where(AIAnalysisJob.id == job_id))).scalar_one_or_none()

    async def update_analysis_job(
        self,
        job_id: int,
        *,
        status: str | None = None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        retry_count: int | None = None,
        processed_symbols: int | None = None,
        failed_symbols: int | None = None,
        total_symbols: int | None = None,
        error_message: str | None = None,
        job_metadata: dict[str, Any] | None = None,
    ) -> AIAnalysisJob | None:
        job = await self.get_analysis_job(job_id)
        if not job:
            return None

        job.updated_at = _utc_now_naive()
        if status is not None:
            job.status = status
        if started_at is not None:
            job.started_at = _to_naive(started_at)
        if finished_at is not None:
            job.finished_at = _to_naive(finished_at)
        if retry_count is not None:
            job.retry_count = retry_count
        if processed_symbols is not None:
            job.processed_symbols = processed_symbols
        if failed_symbols is not None:
            job.failed_symbols = failed_symbols
        if total_symbols is not None:
            job.total_symbols = total_symbols
        if error_message is not None:
            job.error_message = error_message
        if job_metadata is not None:
            job.job_metadata_json = _dump_json(job_metadata)

        await self.session.flush()
        return job

    async def create_agent_run(
        self,
        *,
        job_id: int,
        watchlist_id: int,
        symbol: str,
        agent_name: str,
        status: str = "running",
        model_name: str | None = None,
        prompt_version: str | None = None,
    ) -> AIAgentRun:
        run = AIAgentRun(
            job_id=job_id,
            watchlist_id=watchlist_id,
            symbol=symbol.upper(),
            agent_name=agent_name,
            status=status,
            started_at=_utc_now_naive(),
            model_name=model_name,
            prompt_version=prompt_version,
            created_at=_utc_now_naive(),
        )
        self.session.add(run)
        await self.session.flush()
        return run

    async def complete_agent_run(
        self,
        run_id: int,
        *,
        status: str,
        output: dict[str, Any] | None = None,
        error_message: str | None = None,
        confidence_score: float | None = None,
        importance_score: float | None = None,
        raw_score: float | None = None,
        tokens_input: int | None = None,
        tokens_output: int | None = None,
    ) -> AIAgentRun | None:
        run = (await self.session.execute(select(AIAgentRun).where(AIAgentRun.id == run_id))).scalar_one_or_none()
        if not run:
            return None

        finished_at = _utc_now_naive()
        run.status = status
        run.finished_at = finished_at
        run.duration_ms = _duration_ms(run.started_at, finished_at)
        run.output_json = _dump_json(output) if output is not None else run.output_json
        run.error_message = error_message
        run.confidence_score = confidence_score
        run.importance_score = importance_score
        run.raw_score = raw_score
        run.tokens_input = tokens_input
        run.tokens_output = tokens_output

        await self.session.flush()
        return run

    async def save_stock_analysis(
        self,
        *,
        watchlist_id: int,
        symbol: str,
        overall_signal: str,
        overall_score: float,
        confidence_score: float,
        executive_summary: str,
        job_id: int | None = None,
        thesis_bull: str = "",
        thesis_bear: str = "",
        near_term_risks: list[str] | None = None,
        medium_term_risks: list[str] | None = None,
        catalysts: list[str] | None = None,
        regulation_impact: str = "",
        geo_political_impact: str = "",
        financial_health_summary: str = "",
        technical_summary: str = "",
        event_summary: str = "",
        options_summary: str = "",
        source_health_summary: str = "",
        stale_data_flags: list[str] | None = None,
        citations: list[dict[str, Any]] | None = None,
        model_metadata: dict[str, Any] | None = None,
        agent_run_metadata: dict[str, Any] | None = None,
        expires_at: datetime | None = None,
        factors: list[dict[str, Any]] | None = None,
        source_refs: list[dict[str, Any]] | None = None,
    ) -> AIStockAnalysis:
        normalized_symbol = symbol.upper()
        await self.session.execute(
            update(AIStockAnalysis)
            .where(
                AIStockAnalysis.watchlist_id == watchlist_id,
                AIStockAnalysis.symbol == normalized_symbol,
                AIStockAnalysis.is_latest.is_(True),
            )
            .values(is_latest=False)
        )

        analysis = AIStockAnalysis(
            watchlist_id=watchlist_id,
            symbol=normalized_symbol,
            job_id=job_id,
            overall_signal=overall_signal,
            overall_score=overall_score,
            confidence_score=confidence_score,
            executive_summary=executive_summary,
            thesis_bull=thesis_bull,
            thesis_bear=thesis_bear,
            near_term_risks_json=_dump_json(near_term_risks or []),
            medium_term_risks_json=_dump_json(medium_term_risks or []),
            catalysts_json=_dump_json(catalysts or []),
            regulation_impact=regulation_impact,
            geo_political_impact=geo_political_impact,
            financial_health_summary=financial_health_summary,
            technical_summary=technical_summary,
            event_summary=event_summary,
            options_summary=options_summary,
            source_health_summary=source_health_summary,
            stale_data_flags_json=_dump_json(stale_data_flags or []),
            citations_json=_dump_json(citations or []),
            model_metadata_json=_dump_json(model_metadata or {}),
            agent_run_metadata_json=_dump_json(agent_run_metadata or {}),
            is_latest=True,
            created_at=_utc_now_naive(),
            expires_at=_to_naive(expires_at),
        )
        self.session.add(analysis)
        await self.session.flush()

        if factors:
            self.session.add_all(
                [
                    AIStockAnalysisFactor(
                        analysis_id=analysis.id,
                        symbol=normalized_symbol,
                        category=str(factor.get("category", "general")),
                        factor_type=str(factor.get("factor_type", "neutral")),
                        headline_summary=str(factor.get("headline_summary", "")).strip() or "n/a",
                        detail=str(factor.get("detail", "")).strip() or "n/a",
                        importance_score=_float_or_none(factor.get("importance_score")),
                        confidence_score=_float_or_none(factor.get("confidence_score")),
                        raw_score=_float_or_none(factor.get("raw_score")),
                        source_ref=_string_or_none(factor.get("source_ref")),
                        created_at=_utc_now_naive(),
                    )
                    for factor in factors
                ]
            )

        if source_refs:
            self.session.add_all(
                [
                    AIStockSourceRef(
                        analysis_id=analysis.id,
                        symbol=normalized_symbol,
                        source_type=str(source_ref.get("source_type", "unknown")),
                        source_name=str(source_ref.get("source_name", "unknown")),
                        url=_string_or_none(source_ref.get("url")),
                        title=_string_or_none(source_ref.get("title")),
                        snippet=_string_or_none(source_ref.get("snippet")),
                        published_at=_to_naive(_datetime_or_none(source_ref.get("published_at"))),
                        fetched_at=_to_naive(_datetime_or_none(source_ref.get("fetched_at"))),
                        freshness_minutes=_int_or_none(source_ref.get("freshness_minutes")),
                        reliability_score=_float_or_none(source_ref.get("reliability_score")),
                        source_metadata_json=_dump_json(source_ref.get("source_metadata", {})),
                        created_at=_utc_now_naive(),
                    )
                    for source_ref in source_refs
                ]
            )

        await self.session.flush()
        return analysis

    async def get_latest_analysis(self, watchlist_id: int, symbol: str) -> AIStockAnalysis | None:
        return (
            await self.session.execute(
                select(AIStockAnalysis)
                .where(
                    AIStockAnalysis.watchlist_id == watchlist_id,
                    AIStockAnalysis.symbol == symbol.upper(),
                    AIStockAnalysis.is_latest.is_(True),
                )
                .order_by(AIStockAnalysis.created_at.desc())
            )
        ).scalar_one_or_none()

    async def list_latest_watchlist_analyses(self, watchlist_id: int, limit: int = 100) -> list[AIStockAnalysis]:
        return (
            await self.session.execute(
                select(AIStockAnalysis)
                .where(
                    AIStockAnalysis.watchlist_id == watchlist_id,
                    AIStockAnalysis.is_latest.is_(True),
                )
                .order_by(AIStockAnalysis.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()

    async def upsert_alert_rule(
        self,
        *,
        watchlist_id: int,
        rule_name: str,
        condition: dict[str, Any],
        symbol: str | None = None,
        enabled: bool = True,
        severity: str = "medium",
        cooldown_minutes: int = 60,
    ) -> AIAlertRule:
        normalized_symbol = symbol.upper() if symbol else None
        existing = (
            await self.session.execute(
                select(AIAlertRule).where(
                    AIAlertRule.watchlist_id == watchlist_id,
                    AIAlertRule.symbol == normalized_symbol,
                    AIAlertRule.rule_name == rule_name,
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.enabled = enabled
            existing.severity = severity
            existing.cooldown_minutes = cooldown_minutes
            existing.condition_json = _dump_json(condition)
            existing.updated_at = _utc_now_naive()
            rule = existing
        else:
            rule = AIAlertRule(
                watchlist_id=watchlist_id,
                symbol=normalized_symbol,
                rule_name=rule_name,
                enabled=enabled,
                severity=severity,
                cooldown_minutes=cooldown_minutes,
                condition_json=_dump_json(condition),
                created_at=_utc_now_naive(),
                updated_at=_utc_now_naive(),
            )
            self.session.add(rule)

        await self.session.flush()
        return rule

    async def append_audit_log(
        self,
        *,
        event_type: str,
        message: str,
        watchlist_id: int | None = None,
        job_id: int | None = None,
        analysis_id: int | None = None,
        agent_name: str | None = None,
        log_level: str = "info",
        safe_payload: dict[str, Any] | None = None,
    ) -> AIAuditLog:
        row = AIAuditLog(
            watchlist_id=watchlist_id,
            job_id=job_id,
            analysis_id=analysis_id,
            agent_name=agent_name,
            log_level=log_level,
            event_type=event_type,
            message=message,
            safe_payload_json=_dump_json(safe_payload or {}),
            created_at=_utc_now_naive(),
        )
        self.session.add(row)
        await self.session.flush()
        return row


def _dump_json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=True)


def _utc_now_naive() -> datetime:
    return datetime.now(tz=timezone.utc).replace(tzinfo=None)


def _to_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _datetime_or_none(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int_or_none(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _string_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _duration_ms(started_at: datetime | None, finished_at: datetime | None) -> int | None:
    if started_at is None or finished_at is None:
        return None
    delta = finished_at - started_at
    return max(0, int(delta.total_seconds() * 1000))

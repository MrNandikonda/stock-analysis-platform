from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents import build_stock_agents
from app.ai.agents.base import AgentExecutionContext
from app.ai.prompt_registry import get_prompt
from app.ai.providers import AIProviderRegistry
from app.ai.schemas import (
    AggregatedAnalysis,
    FactorItem,
    SourceRef,
    SpecialistOutput,
    normalize_categories,
)
from app.ai.services.config_service import AIConfigService
from app.ai.services.data_access_service import AIDataAccessService
from app.ai.services.persistence_service import AIPersistenceService
from app.ai.tool_registry import AIToolContext
from app.core.config import get_settings
from app.models.ai_entities import AIAnalysisJob, AIWatchlistSetting
from app.core.database import async_session_factory


class AIWatchlistOrchestrator:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = get_settings()
        self.persistence = AIPersistenceService(session)
        self.data_access = AIDataAccessService(session)
        self.config_service = AIConfigService(session)
        self.provider_registry = AIProviderRegistry()
        self.logger = logging.getLogger(__name__)

    async def run_due_watchlists(self) -> list[dict[str, Any]]:
        now = datetime.now(UTC).replace(tzinfo=None)
        enabled_settings = await self.persistence.list_enabled_watchlist_settings()
        results = []
        for setting in enabled_settings:
            if setting.next_run_at and setting.next_run_at > now:
                continue
            results.append(await self.run_watchlist_analysis(setting.watchlist_id, triggered_by="scheduler"))
        return results

    async def cleanup_stale_jobs(self) -> int:
        stale_before = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=self.settings.ai_job_stale_minutes)
        result = await self.session.execute(
            update(AIAnalysisJob)
            .where(AIAnalysisJob.status == "running", AIAnalysisJob.started_at.is_not(None), AIAnalysisJob.started_at < stale_before)
            .values(
                status="stale",
                finished_at=datetime.now(UTC).replace(tzinfo=None),
                error_message="Marked stale by scheduler cleanup.",
            )
        )
        return int(result.rowcount or 0)

    async def run_watchlist_analysis(
        self,
        watchlist_id: int,
        *,
        triggered_by: str = "manual",
        force: bool = False,
    ) -> dict[str, Any]:
        watchlist = await self.data_access.get_watchlist(watchlist_id)
        if watchlist is None:
            raise ValueError("Watchlist not found")

        setting = await self.persistence.get_watchlist_setting(watchlist_id)
        if setting is None:
            setting = await self.persistence.upsert_watchlist_setting(
                watchlist_id,
                enabled=False,
                cadence_minutes=self.settings.ai_default_schedule_minutes,
                categories=list(normalize_categories(None)),
                provider_name=self.settings.ai_default_provider,
                max_stocks_per_job=self.settings.ai_max_stocks_per_job,
                max_parallel_agents=self.settings.ai_max_parallel_agents,
                stale_after_minutes=self.settings.ai_default_stale_after_minutes,
            )

        running_job = (
            await self.session.execute(
                select(AIAnalysisJob)
                .where(AIAnalysisJob.watchlist_id == watchlist_id, AIAnalysisJob.status == "running")
                .order_by(AIAnalysisJob.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if running_job is not None:
            return {"job_id": running_job.id, "status": "already_running"}

        resolved_provider = await self.config_service.resolve_provider(setting.provider_name)
        provider = self.provider_registry.build(resolved_provider.provider_name)
        symbols = [item["symbol"] for item in watchlist["symbols"]][: max(1, setting.max_stocks_per_job)]
        job = await self.persistence.create_analysis_job(
            watchlist_id,
            triggered_by=triggered_by,
            scheduled_for=datetime.now(UTC),
            total_symbols=len(symbols),
            job_metadata={
                "provider_name": resolved_provider.provider_name,
                "watchlist_name": watchlist["name"],
                "truncated": len(watchlist["symbols"]) > len(symbols),
            },
        )
        await self.persistence.update_analysis_job(job.id, status="running", started_at=datetime.now(UTC))
        await self.persistence.append_audit_log(
            watchlist_id=watchlist_id,
            job_id=job.id,
            event_type="job_started",
            message=f"AI watchlist analysis started for {watchlist['name']}.",
            safe_payload={"symbols": len(symbols), "provider_name": resolved_provider.provider_name},
        )

        semaphore = asyncio.Semaphore(max(1, setting.max_parallel_agents))
        processed = 0
        failed = 0
        tasks = [self._process_symbol(setting, watchlist["name"], symbol, job.id, provider, resolved_provider, force, semaphore) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                self.logger.exception("symbol processing task raised: %s", result)
                failed += 1
                continue
            if result.get("status") == "failed":
                failed += 1
            elif result.get("status") != "skipped":
                processed += 1

        finished_at = datetime.now(UTC)
        final_status = "completed" if failed < len(symbols) else "failed"
        await self.persistence.update_analysis_job(
            job.id,
            status=final_status,
            finished_at=finished_at,
            processed_symbols=processed,
            failed_symbols=failed,
        )

        setting.last_run_at = finished_at.replace(tzinfo=None)
        setting.next_run_at = (finished_at + timedelta(minutes=setting.cadence_minutes)).replace(tzinfo=None)
        setting.updated_at = finished_at.replace(tzinfo=None)
        await self.persistence.append_audit_log(
            watchlist_id=watchlist_id,
            job_id=job.id,
            event_type="job_finished",
            message=f"AI watchlist analysis finished with status {final_status}.",
            safe_payload={"processed_symbols": processed, "failed_symbols": failed},
        )
        return {"job_id": job.id, "status": final_status, "processed_symbols": processed, "failed_symbols": failed}

    async def _process_symbol(
        self,
        setting: AIWatchlistSetting,
        watchlist_name: str,
        symbol: str,
        job_id: int,
        provider,
        resolved_provider,
        force: bool,
        semaphore: asyncio.Semaphore,
    ) -> dict[str, Any]:
        async with semaphore:
            # Use a dedicated DB session for each symbol to avoid concurrent AsyncSession use
            async with async_session_factory() as local_session:
                local_persistence = AIPersistenceService(local_session)
                local_data_access = AIDataAccessService(local_session)

                latest_analysis = await local_persistence.get_latest_analysis(setting.watchlist_id, symbol)
                if not force and latest_analysis and latest_analysis.created_at:
                    if not await local_data_access.has_material_update(symbol, latest_analysis.created_at):
                        return {"symbol": symbol, "status": "skipped"}

                snapshot = await local_data_access.get_stock_snapshot(symbol)
                if snapshot is None:
                    return {"symbol": symbol, "status": "failed"}

                categories = set(normalize_categories(_json_list(setting.categories_json)))
                outputs: list[SpecialistOutput] = []
                run_metadata: dict[str, Any] = {}
                for agent in build_stock_agents():
                    if agent.category not in categories:
                        continue
                    run = await local_persistence.create_agent_run(
                        job_id=job_id,
                        watchlist_id=setting.watchlist_id,
                        symbol=symbol,
                        agent_name=agent.name,
                        model_name=resolved_provider.specialist_model,
                        prompt_version=get_prompt(agent.prompt_name).version,
                    )
                    try:
                        output = await agent.analyze(
                            AgentExecutionContext(
                                watchlist_id=setting.watchlist_id,
                                watchlist_name=watchlist_name,
                                symbol=symbol,
                                provider=provider,
                                model_name=resolved_provider.specialist_model,
                                tool_context=AIToolContext(
                                    watchlist_id=setting.watchlist_id,
                                    symbol=symbol,
                                    data_access=local_data_access,
                                    persistence=local_persistence,
                                    job_id=job_id,
                                    allow_write_tools=False,
                                ),
                                stock_snapshot=snapshot,
                            )
                        )
                        outputs.append(output)
                        run_metadata[agent.name] = output.model_metadata
                        await local_persistence.complete_agent_run(
                            run.id,
                            status="completed",
                            output=output.model_dump(mode="json"),
                            confidence_score=output.confidence_score,
                            importance_score=output.importance_score,
                            raw_score=output.raw_score,
                            tokens_input=_safe_int(output.model_metadata.get("input_tokens")),
                            tokens_output=_safe_int(output.model_metadata.get("output_tokens")),
                        )
                    except Exception as exc:
                        await local_persistence.complete_agent_run(run.id, status="failed", error_message=str(exc))
                        await local_persistence.append_audit_log(
                            watchlist_id=setting.watchlist_id,
                            job_id=job_id,
                            agent_name=agent.name,
                            event_type="agent_failed",
                            message=f"{agent.name} failed for {symbol}.",
                            log_level="warning",
                            safe_payload={"error": str(exc)[:300]},
                        )

                if not outputs:
                    return {"symbol": symbol, "status": "failed"}

                aggregated = await self._aggregate_outputs(
                    watchlist_id=setting.watchlist_id,
                    symbol=symbol,
                    outputs=outputs,
                    provider=provider,
                    model_name=resolved_provider.orchestrator_model,
                    run_metadata=run_metadata,
                )
                analysis = await local_persistence.save_stock_analysis(
                    watchlist_id=setting.watchlist_id,
                    symbol=symbol,
                    job_id=job_id,
                    overall_signal=aggregated.overall_signal,
                    overall_score=aggregated.overall_score,
                    confidence_score=aggregated.confidence_score,
                    executive_summary=aggregated.executive_summary,
                    thesis_bull=aggregated.thesis_bull,
                    thesis_bear=aggregated.thesis_bear,
                    near_term_risks=aggregated.near_term_risks,
                    medium_term_risks=aggregated.medium_term_risks,
                    catalysts=aggregated.catalysts,
                    regulation_impact=aggregated.regulation_impact,
                    geo_political_impact=aggregated.geo_political_impact,
                    financial_health_summary=aggregated.financial_health_summary,
                    technical_summary=aggregated.technical_summary,
                    event_summary=aggregated.event_summary,
                    options_summary=aggregated.options_summary,
                    source_health_summary=aggregated.source_health_summary,
                    stale_data_flags=aggregated.stale_data_flags,
                    citations=[item.model_dump(mode="json") for item in aggregated.citations],
                    model_metadata=aggregated.model_metadata,
                    agent_run_metadata=aggregated.agent_run_metadata,
                    expires_at=datetime.now(UTC) + timedelta(minutes=setting.stale_after_minutes),
                    factors=[item.model_dump(mode="json") for item in aggregated.factors],
                    source_refs=[item.model_dump(mode="json") for item in aggregated.source_refs],
                )
                await local_persistence.append_audit_log(
                    watchlist_id=setting.watchlist_id,
                    job_id=job_id,
                    analysis_id=analysis.id,
                    event_type="analysis_saved",
                    message=f"Saved AI analysis for {symbol}.",
                    safe_payload={"overall_signal": aggregated.overall_signal, "overall_score": aggregated.overall_score},
                )
                return {"symbol": symbol, "status": "completed", "analysis_id": analysis.id}

    async def _aggregate_outputs(
        self,
        *,
        watchlist_id: int,
        symbol: str,
        outputs: list[SpecialistOutput],
        provider,
        model_name: str,
        run_metadata: dict[str, Any],
    ) -> AggregatedAnalysis:
        if provider.supports_remote_inference and provider.health_check().ready:
            try:
                # Bound remote provider runtime to avoid hanging the orchestrator
                result = await asyncio.wait_for(
                    provider.generate_structured_output(
                        model_name=model_name,
                        instructions=get_prompt("orchestrator").instructions,
                        payload={
                            "watchlist_id": watchlist_id,
                            "symbol": symbol,
                            "specialist_outputs": [item.model_dump(mode="json") for item in outputs],
                        },
                        output_model=AggregatedAnalysis,
                        tools=[],
                        reasoning_effort="medium",
                    ),
                    timeout=60,
                )
                aggregated = AggregatedAnalysis.model_validate(result.payload)
                aggregated.model_metadata.update(
                    {
                        "provider_name": result.provider_name,
                        "model_name": result.model_name,
                        "input_tokens": result.input_tokens,
                        "output_tokens": result.output_tokens,
                        "prompt_version": get_prompt("orchestrator").version,
                        "mode": "llm",
                    }
                )
                return aggregated
            except asyncio.TimeoutError:
                self.logger.warning(
                    "provider.generate_structured_output timed out for watchlist=%s symbol=%s",
                    watchlist_id,
                    symbol,
                )
            except Exception as exc:
                self.logger.exception(
                    "provider.generate_structured_output failed for watchlist=%s symbol=%s: %s",
                    watchlist_id,
                    symbol,
                    exc,
                )
        return self._heuristic_aggregate(watchlist_id=watchlist_id, symbol=symbol, outputs=outputs, run_metadata=run_metadata)

    def _heuristic_aggregate(
        self,
        *,
        watchlist_id: int,
        symbol: str,
        outputs: list[SpecialistOutput],
        run_metadata: dict[str, Any],
    ) -> AggregatedAnalysis:
        factors: list[FactorItem] = []
        source_refs: list[SourceRef] = []
        category_summaries: dict[str, str] = {}
        weighted_score = 0.0
        total_weight = 0.0
        confidence_values: list[float] = []
        stale_flags: list[str] = []

        for output in outputs:
            category_summaries[output.category] = output.headline_summary
            weight = max(0.2, output.confidence_score) * max(10.0, output.importance_score)
            weighted_score += output.raw_score * weight
            total_weight += weight
            confidence_values.append(output.confidence_score)
            stale_flags.extend(output.risk_flags if output.category == "source_health" else [])
            source_refs.extend(output.source_refs)
            factors.extend(_output_to_factors(output))

        overall_score = round(weighted_score / total_weight, 3) if total_weight else 0.0
        disagreement_penalty = 0.1 if _has_strong_disagreement(outputs) else 0.0
        stale_penalty = 0.1 if stale_flags else 0.0
        confidence = max(0.15, round((_average(confidence_values) or 0.35) - disagreement_penalty - stale_penalty, 3))
        signal = _score_to_signal(overall_score)

        bullish_factors = [factor.detail for factor in factors if factor.factor_type == "bullish"][:4]
        bearish_factors = [factor.detail for factor in factors if factor.factor_type == "bearish"][:4]
        catalyst_factors = [factor.detail for factor in factors if factor.factor_type == "catalyst"][:4]
        risk_factors = [factor.detail for factor in factors if factor.factor_type in {"risk", "stale"}][:4]

        executive_summary = _build_executive_summary(symbol, signal, category_summaries)
        return AggregatedAnalysis(
            symbol=symbol,
            watchlist_id=watchlist_id,
            overall_signal=signal,
            overall_score=overall_score,
            confidence_score=confidence,
            executive_summary=executive_summary,
            thesis_bull="; ".join(bullish_factors[:3]),
            thesis_bear="; ".join(bearish_factors[:3]),
            near_term_risks=risk_factors[:4],
            medium_term_risks=[value for value in bearish_factors if value not in risk_factors][:4],
            catalysts=catalyst_factors[:4] or bullish_factors[:3],
            regulation_impact=category_summaries.get("regulation", ""),
            geo_political_impact=category_summaries.get("geopolitical_risk", ""),
            financial_health_summary=category_summaries.get("fundamentals", ""),
            technical_summary=category_summaries.get("technicals", ""),
            event_summary=category_summaries.get("earnings_events", ""),
            options_summary=category_summaries.get("options_flow", ""),
            source_health_summary=category_summaries.get("source_health", ""),
            stale_data_flags=sorted(set(stale_flags)),
            citations=_dedupe_source_refs(source_refs),
            model_metadata={"provider_name": "local-summary", "model_name": "deterministic-template", "mode": "heuristic"},
            agent_run_metadata=run_metadata,
            factors=factors,
            source_refs=_dedupe_source_refs(source_refs),
        )


def _output_to_factors(output: SpecialistOutput) -> list[FactorItem]:
    factors: list[FactorItem] = []
    for value in output.bullish_factors:
        factors.append(
            FactorItem(
                category=output.category,
                factor_type="bullish",
                headline_summary=output.headline_summary[:255],
                detail=value,
                importance_score=output.importance_score,
                confidence_score=output.confidence_score,
                raw_score=max(0.0, output.raw_score),
            )
        )
    for value in output.bearish_factors:
        factors.append(
            FactorItem(
                category=output.category,
                factor_type="bearish",
                headline_summary=output.headline_summary[:255],
                detail=value,
                importance_score=output.importance_score,
                confidence_score=output.confidence_score,
                raw_score=min(0.0, output.raw_score),
            )
        )
    for value in output.neutral_factors:
        factors.append(
            FactorItem(
                category=output.category,
                factor_type="neutral",
                headline_summary=output.headline_summary[:255],
                detail=value,
                importance_score=max(10.0, output.importance_score * 0.6),
                confidence_score=output.confidence_score,
                raw_score=0.0,
            )
        )
    for value in output.risk_flags:
        factors.append(
            FactorItem(
                category=output.category,
                factor_type="risk" if output.category != "source_health" else "stale",
                headline_summary=output.headline_summary[:255],
                detail=value.replace("_", " "),
                importance_score=output.importance_score,
                confidence_score=output.confidence_score,
                raw_score=min(0.0, output.raw_score),
            )
        )
    for value in output.recommended_actions[:1]:
        factors.append(
            FactorItem(
                category=output.category,
                factor_type="catalyst",
                headline_summary=output.headline_summary[:255],
                detail=value,
                importance_score=max(10.0, output.importance_score * 0.5),
                confidence_score=output.confidence_score,
                raw_score=max(0.0, output.raw_score),
            )
        )
    return factors


def _build_executive_summary(symbol: str, signal: str, summaries: dict[str, str]) -> str:
    primary = summaries.get("fundamentals") or summaries.get("technicals") or summaries.get("news_intel") or "Signals are mixed."
    return f"{symbol} screens as {signal.replace('_', ' ')}. {primary}"


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


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _dedupe_source_refs(source_refs: list[SourceRef]) -> list[SourceRef]:
    deduped: list[SourceRef] = []
    seen: set[tuple[str | None, str | None]] = set()
    for source_ref in source_refs:
        key = (source_ref.url, source_ref.title)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(source_ref)
    return deduped[:20]


def _has_strong_disagreement(outputs: list[SpecialistOutput]) -> bool:
    positive = sum(1 for output in outputs if output.raw_score >= 20)
    negative = sum(1 for output in outputs if output.raw_score <= -20)
    return positive > 0 and negative > 0


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _json_list(raw_value: str | None) -> list[str]:
    import json

    if not raw_value:
        return []
    try:
        payload = json.loads(raw_value)
        return payload if isinstance(payload, list) else []
    except json.JSONDecodeError:
        return []

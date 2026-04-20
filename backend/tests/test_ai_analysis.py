from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from app.ai.orchestrator import AIWatchlistOrchestrator
from app.ai.schemas import SpecialistOutput
from app.ai.services.config_service import AIConfigService
from app.ai.services.persistence_service import AIPersistenceService
from app.models.ai_entities import AIAgentRun, AIStockAnalysis
from app.models.entities import Fundamental, PriceHistory, Watchlist, WatchlistItem
from app.services.news_service import NewsService


@pytest.mark.asyncio
async def test_ai_status_uses_local_fallback_without_openai_key(db_session, monkeypatch) -> None:
    monkeypatch.setenv("AI_ANALYSIS_ENABLED", "true")
    monkeypatch.setenv("AI_DEFAULT_PROVIDER", "local-summary")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    service = AIConfigService(db_session)
    statuses = await service.list_provider_statuses()
    status_by_name = {status.provider_name: status for status in statuses}

    assert status_by_name["local-summary"].ready is True
    assert status_by_name["openai"].ready is False


@pytest.mark.asyncio
async def test_orchestrator_runs_watchlist_analysis_with_local_provider(seeded_session, monkeypatch) -> None:
    monkeypatch.setenv("AI_ANALYSIS_ENABLED", "true")
    monkeypatch.setenv("AI_DEFAULT_PROVIDER", "local-summary")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    async def fake_fetch_news(self, symbols=None, limit=50):
        return [
            {
                "title": "AAA expands enterprise deal pipeline",
                "summary": "Momentum remains constructive after a new contract win.",
                "link": "https://example.com/aaa-news",
                "published": datetime.now(UTC).isoformat(),
                "source": "Test Feed",
                "sentiment": 0.42,
            }
        ]

    monkeypatch.setattr(NewsService, "fetch_news", fake_fetch_news)

    watchlist = Watchlist(user_id="local", name="AI Local")
    seeded_session.add(watchlist)
    await seeded_session.flush()
    seeded_session.add(WatchlistItem(watchlist_id=watchlist.id, symbol="AAA"))
    seeded_session.add(
        Fundamental(
            symbol="AAA",
            date=date.today(),
            pe=12,
            pb=2.1,
            peg=1.1,
            ev_ebitda=10,
            dividend_yield=1.2,
            roe=22,
            roce=18,
            debt_equity=0.3,
            profit_margin=14,
            revenue_growth=12,
            eps=6.5,
        )
    )
    seeded_session.add(
        PriceHistory(
            symbol="AAA",
            date=datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1),
            open=98,
            high=101,
            low=97,
            close=100,
            volume=150000,
        )
    )
    await seeded_session.commit()

    persistence = AIPersistenceService(seeded_session)
    await persistence.upsert_watchlist_setting(
        watchlist.id,
        enabled=True,
        cadence_minutes=30,
        categories=["news_intel", "fundamentals", "technicals", "source_health"],
        provider_name="local-summary",
        max_stocks_per_job=5,
        max_parallel_agents=1,
        stale_after_minutes=180,
        next_run_at=datetime.now(UTC),
    )

    orchestrator = AIWatchlistOrchestrator(seeded_session)
    result = await orchestrator.run_watchlist_analysis(watchlist.id, triggered_by="manual", force=True)
    await seeded_session.commit()

    latest_analysis = await persistence.get_latest_analysis(watchlist.id, "AAA")
    agent_runs = (await seeded_session.execute(AIAgentRun.__table__.select())).all()

    assert result["status"] == "completed"
    assert latest_analysis is not None
    assert latest_analysis.overall_signal in {"bullish", "strong_bullish", "neutral"}
    assert len(agent_runs) >= 3


@pytest.mark.asyncio
async def test_orchestrator_runs_due_watchlists(seeded_session, monkeypatch) -> None:
    monkeypatch.setenv("AI_ANALYSIS_ENABLED", "true")
    monkeypatch.setenv("AI_DEFAULT_PROVIDER", "local-summary")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    async def fake_fetch_news(self, symbols=None, limit=50):
        return []

    monkeypatch.setattr(NewsService, "fetch_news", fake_fetch_news)

    watchlist = Watchlist(user_id="local", name="Due AI")
    seeded_session.add(watchlist)
    await seeded_session.flush()
    seeded_session.add(WatchlistItem(watchlist_id=watchlist.id, symbol="BBB"))
    seeded_session.add(
        Fundamental(
            symbol="BBB",
            date=date.today(),
            pe=18,
            pb=1.8,
            peg=1.3,
            ev_ebitda=11,
            dividend_yield=1.0,
            roe=11,
            roce=10,
            debt_equity=0.8,
            profit_margin=9,
            revenue_growth=4,
            eps=3.4,
        )
    )
    await seeded_session.commit()

    persistence = AIPersistenceService(seeded_session)
    await persistence.upsert_watchlist_setting(
        watchlist.id,
        enabled=True,
        cadence_minutes=30,
        categories=["fundamentals", "technicals", "source_health"],
        provider_name="local-summary",
        max_stocks_per_job=5,
        max_parallel_agents=1,
        stale_after_minutes=180,
        next_run_at=datetime.now(UTC) - timedelta(minutes=1),
    )

    orchestrator = AIWatchlistOrchestrator(seeded_session)
    results = await orchestrator.run_due_watchlists()
    await seeded_session.commit()

    latest_analysis = await persistence.get_latest_analysis(watchlist.id, "BBB")
    assert results
    assert latest_analysis is not None


def test_specialist_output_schema_rejects_invalid_confidence() -> None:
    with pytest.raises(Exception):
        SpecialistOutput.model_validate(
            {
                "symbol": "AAA",
                "market": "NSE",
                "category": "news_intel",
                "headline_summary": "Invalid payload",
                "bullish_factors": [],
                "bearish_factors": [],
                "neutral_factors": [],
                "confidence_score": 1.5,
                "importance_score": 50,
                "source_refs": [],
                "recommended_actions": [],
                "risk_flags": [],
                "raw_score": 0,
            }
        )

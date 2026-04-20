from __future__ import annotations

from datetime import UTC, datetime

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SourceRef, SpecialistOutput


class EarningsEventsAgent(BaseSpecialistAgent):
    name = "EarningsEventsAgent"
    category = "earnings_events"
    prompt_name = "earnings_events"
    allowed_tools = ("get_stock_snapshot", "get_earnings_events")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        events = await context.tool_context.data_access.get_earnings_events(context.symbol)
        if not events:
            return SpecialistOutput(
                symbol=context.symbol,
                market=market_from_snapshot(context.stock_snapshot),
                category="earnings_events",
                headline_summary="No near-term earnings event was found in the lightweight calendar.",
                confidence_score=0.2,
                importance_score=18,
                raw_score=0,
                insufficient_evidence=True,
                neutral_factors=["No earnings event was returned for this symbol."],
            )

        event = events[0]
        event_dt = datetime.fromisoformat(event["earnings_date_utc"].replace("Z", "+00:00"))
        days_to_event = max(0, (event_dt.astimezone(UTC).date() - datetime.now(UTC).date()).days)
        neutral = [f"Earnings event is scheduled in about {days_to_event} day(s)."]
        risk_flags = []
        score = 0.0
        if days_to_event <= 3:
            risk_flags.append("earnings_imminent")
            score -= 8
        elif days_to_event <= 10:
            score += 2
        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="earnings_events",
            headline_summary="Event timing is a near-term catalyst and volatility checkpoint.",
            bullish_factors=["An upcoming event can reset the narrative quickly."] if days_to_event <= 10 else [],
            bearish_factors=["Very near earnings can increase gap risk."] if days_to_event <= 3 else [],
            neutral_factors=neutral,
            confidence_score=0.58,
            importance_score=64,
            source_refs=[
                SourceRef(
                    source_type="earnings_calendar",
                    source_name="lightweight_earnings_calendar",
                    title=f"{context.symbol} earnings calendar",
                    snippet=neutral[0],
                    published_at=event["earnings_date_utc"],
                    reliability_score=0.55,
                )
            ],
            recommended_actions=["Treat the next earnings date as a volatility checkpoint in the thesis."],
            risk_flags=risk_flags,
            raw_score=clip_score(score),
        )

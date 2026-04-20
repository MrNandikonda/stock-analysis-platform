from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SpecialistOutput


class SourceHealthAgent(BaseSpecialistAgent):
    name = "SourceHealthAgent"
    category = "source_health"
    prompt_name = "source_health"
    allowed_tools = ("get_stock_snapshot", "get_source_health", "get_news_items")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        health = await context.tool_context.data_access.get_source_health(context.symbol)
        stale_flags = list(health.get("stale_flags", []))
        reliability = float(health.get("reliability_score", 0.0))
        bullish = []
        bearish = []
        neutral = []
        score = 0.0

        if "market_data_stale" not in stale_flags:
            bullish.append("Market snapshot is reasonably fresh.")
            score += 8
        else:
            bearish.append("Market snapshot is stale and lowers confidence.")
            score -= 15

        if "fundamentals_stale" in stale_flags:
            bearish.append("Fundamentals are stale relative to the desired cadence.")
            score -= 10
        else:
            bullish.append("Fundamentals are still within a usable window.")
            score += 6

        if "news_sparse" in stale_flags:
            neutral.append("Headline coverage is sparse in the lightweight source set.")

        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="source_health",
            headline_summary="Source freshness directly affects how much trust to place in the rest of the analysis.",
            bullish_factors=bullish[:3],
            bearish_factors=bearish[:3],
            neutral_factors=neutral[:3],
            confidence_score=0.82,
            importance_score=70,
            freshness_minutes=health.get("market_data_freshness_minutes"),
            recommended_actions=["Lower conviction when multiple stale-data flags are present."],
            risk_flags=stale_flags,
            raw_score=clip_score(score),
            insufficient_evidence=reliability < 0.3,
        )

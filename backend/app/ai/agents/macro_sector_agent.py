from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SpecialistOutput


class MacroSectorAgent(BaseSpecialistAgent):
    name = "MacroSectorAgent"
    category = "macro_sector"
    prompt_name = "macro_sector"
    allowed_tools = ("get_stock_snapshot", "get_sector_context")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        sector_context = await context.tool_context.data_access.get_sector_context(context.symbol)
        if not sector_context.get("available"):
            return SpecialistOutput(
                symbol=context.symbol,
                market=market_from_snapshot(context.stock_snapshot),
                category="macro_sector",
                headline_summary="Sector context is limited, so macro read-through is weak.",
                confidence_score=0.2,
                importance_score=18,
                raw_score=0,
                insufficient_evidence=True,
                neutral_factors=["Not enough peer data is available for a reliable sector comparison."],
            )

        avg_change_1m = sector_context.get("avg_change_1m") or 0
        score = 0.0
        bullish = []
        bearish = []
        if avg_change_1m >= 6:
            bullish.append("Sector peers have positive 1-month momentum.")
            score += 14
        elif avg_change_1m <= -6:
            bearish.append("Sector peers are under pressure on a 1-month basis.")
            score -= 14

        if not bullish and not bearish:
            bullish = []
            bearish = []

        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="macro_sector",
            headline_summary="Sector tone can either support or cap the single-name thesis.",
            bullish_factors=bullish,
            bearish_factors=bearish,
            neutral_factors=[
                f"Peer set covers about {sector_context.get('peer_count', 0)} names in sector '{sector_context.get('sector', 'Unknown')}'."
            ],
            confidence_score=0.48,
            importance_score=44,
            recommended_actions=["Use sector context to confirm, not replace, company-specific signals."],
            risk_flags=["sector_pressure"] if score < 0 else [],
            raw_score=clip_score(score),
        )

from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SpecialistOutput


class PortfolioImpactAgent(BaseSpecialistAgent):
    name = "PortfolioImpactAgent"
    category = "portfolio_impact"
    prompt_name = "portfolio_impact"
    allowed_tools = ("get_stock_snapshot", "get_sector_context")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        impact = await context.tool_context.data_access.get_portfolio_impact(context.symbol)
        if not impact.get("is_held"):
            return SpecialistOutput(
                symbol=context.symbol,
                market=market_from_snapshot(context.stock_snapshot),
                category="portfolio_impact",
                headline_summary="The symbol is not currently held, so portfolio impact is limited to watchlist relevance.",
                confidence_score=0.7,
                importance_score=20,
                raw_score=0,
                neutral_factors=["The current local portfolio does not hold this symbol."],
                recommended_actions=["Use watchlist analysis to decide whether the name deserves portfolio entry review."],
            )

        weight = float(impact.get("portfolio_weight", 0.0))
        score = 4.0 if weight < 10 else -6.0 if weight >= 20 else 0.0
        bullish = ["Position size is moderate enough to keep stock-specific risk contained."] if weight < 10 else []
        bearish = ["Position size is large enough to amplify portfolio-level drawdown risk."] if weight >= 20 else []
        neutral = [f"Estimated portfolio weight is about {weight:.1f}%."]
        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="portfolio_impact",
            headline_summary="Portfolio concentration changes how much this stock matters to the user.",
            bullish_factors=bullish,
            bearish_factors=bearish,
            neutral_factors=neutral,
            confidence_score=0.74,
            importance_score=62,
            recommended_actions=["Size conviction and risk control should reflect the current portfolio weight."],
            risk_flags=["position_concentration"] if weight >= 20 else [],
            raw_score=clip_score(score),
        )

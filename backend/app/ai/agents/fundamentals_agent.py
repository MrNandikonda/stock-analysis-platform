from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SpecialistOutput


class FundamentalsAgent(BaseSpecialistAgent):
    name = "FundamentalsAgent"
    category = "fundamentals"
    prompt_name = "fundamentals"
    allowed_tools = ("get_stock_snapshot", "get_fundamentals", "get_sector_context")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        fundamentals = await context.tool_context.data_access.get_fundamentals(context.symbol)
        sector_context = await context.tool_context.data_access.get_sector_context(context.symbol)
        if not fundamentals.get("available"):
            return SpecialistOutput(
                symbol=context.symbol,
                market=market_from_snapshot(context.stock_snapshot),
                category="fundamentals",
                headline_summary="Fundamental coverage is too thin to form a strong view.",
                confidence_score=0.2,
                importance_score=25,
                raw_score=0,
                insufficient_evidence=True,
                neutral_factors=["No recent fundamentals snapshot is available in the local cache."],
                recommended_actions=["Refresh fundamentals before leaning on valuation signals."],
            )

        bullish: list[str] = []
        bearish: list[str] = []
        neutral: list[str] = []
        score = 0.0

        pe = fundamentals.get("pe")
        avg_pe = sector_context.get("avg_pe")
        roe = fundamentals.get("roe")
        avg_roe = sector_context.get("avg_roe")
        debt_equity = fundamentals.get("debt_equity")
        revenue_growth = fundamentals.get("revenue_growth")
        profit_margin = fundamentals.get("profit_margin")
        dividend_yield = fundamentals.get("dividend_yield")

        if pe is not None and avg_pe is not None:
            if pe < avg_pe * 0.85:
                bullish.append("Valuation sits below sector average P/E.")
                score += 18
            elif pe > avg_pe * 1.2:
                bearish.append("Valuation trades above sector average P/E.")
                score -= 18
            else:
                neutral.append("Valuation is broadly in line with peers.")

        if roe is not None:
            if avg_roe is not None and roe > avg_roe + 3:
                bullish.append("Return on equity is stronger than sector peers.")
                score += 16
            elif avg_roe is not None and roe < avg_roe - 3:
                bearish.append("Return on equity trails sector peers.")
                score -= 14
            elif roe >= 15:
                bullish.append("Return on equity is healthy.")
                score += 10

        if debt_equity is not None:
            if debt_equity <= 0.5:
                bullish.append("Leverage remains moderate.")
                score += 10
            elif debt_equity >= 1.2:
                bearish.append("Leverage is elevated and may cap upside.")
                score -= 14

        if revenue_growth is not None:
            if revenue_growth >= 10:
                bullish.append("Revenue growth is supporting the current thesis.")
                score += 12
            elif revenue_growth <= 0:
                bearish.append("Revenue growth is soft or negative.")
                score -= 12

        if profit_margin is not None:
            if profit_margin >= 12:
                bullish.append("Profit margins remain resilient.")
                score += 8
            elif profit_margin <= 5:
                bearish.append("Profit margin profile is thin.")
                score -= 8

        if dividend_yield is not None and dividend_yield >= 2.5:
            bullish.append("Dividend support adds defensive value.")
            score += 6

        if not bullish and not bearish and not neutral:
            neutral.append("Fundamental signals are mixed and do not point strongly in either direction.")

        headline = (
            "Fundamental profile looks supportive versus current peer context."
            if score > 15
            else "Fundamental picture is mixed with limited edge."
            if score >= -15
            else "Fundamental profile has enough pressure points to keep the thesis cautious."
        )
        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="fundamentals",
            headline_summary=headline,
            bullish_factors=bullish[:4],
            bearish_factors=bearish[:4],
            neutral_factors=neutral[:3],
            confidence_score=0.72 if fundamentals.get("date") else 0.5,
            importance_score=78,
            freshness_minutes=None,
            recommended_actions=["Recheck peer-relative valuation after the next fundamentals refresh."],
            risk_flags=["balance_sheet_pressure"] if (debt_equity or 0) >= 1.2 else [],
            raw_score=clip_score(score),
        )

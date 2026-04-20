from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot, source_ref_from_market_data
from app.ai.schemas import SpecialistOutput


class TechnicalsAgent(BaseSpecialistAgent):
    name = "TechnicalsAgent"
    category = "technicals"
    prompt_name = "technicals"
    allowed_tools = ("get_stock_snapshot", "get_price_history", "get_source_health")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        snapshot = context.stock_snapshot or {}
        price = snapshot.get("price")
        rsi = snapshot.get("rsi_14")
        macd = snapshot.get("macd")
        macd_signal = snapshot.get("macd_signal")
        sma_50 = snapshot.get("sma_50")
        sma_200 = snapshot.get("sma_200")
        updated_at = snapshot.get("updated_at")

        bullish: list[str] = []
        bearish: list[str] = []
        neutral: list[str] = []
        score = 0.0

        if price is not None and sma_50 is not None and sma_200 is not None:
            if price > sma_50 > sma_200:
                bullish.append("Price is above the 50-day and 200-day trend lines.")
                score += 24
            elif price < sma_50 < sma_200:
                bearish.append("Price is below both major moving averages.")
                score -= 24
            else:
                neutral.append("Trend structure is mixed across moving averages.")

        if macd is not None and macd_signal is not None:
            if macd > macd_signal:
                bullish.append("MACD remains above its signal line.")
                score += 12
            elif macd < macd_signal:
                bearish.append("MACD is below its signal line.")
                score -= 12

        if rsi is not None:
            if 50 <= rsi <= 68:
                bullish.append("RSI is in a constructive momentum zone without being extreme.")
                score += 10
            elif rsi >= 75:
                bearish.append("RSI is extended and raises pullback risk.")
                score -= 10
            elif rsi <= 35:
                neutral.append("RSI is washed out, which can cut both ways.")

        if not bullish and not bearish and not neutral:
            neutral.append("Technical signals are incomplete in the local snapshot.")

        headline = (
            "Trend and momentum signals lean constructive."
            if score > 15
            else "Technicals are balanced without a strong edge."
            if score >= -15
            else "Trend and momentum signals lean cautious."
        )
        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(snapshot),
            category="technicals",
            headline_summary=headline,
            bullish_factors=bullish[:4],
            bearish_factors=bearish[:4],
            neutral_factors=neutral[:3],
            confidence_score=0.68 if updated_at else 0.35,
            importance_score=72,
            freshness_minutes=source_ref_from_market_data(context.symbol, "", updated_at).freshness_minutes,
            source_refs=[source_ref_from_market_data(context.symbol, "Latest stock_metrics technical snapshot.", updated_at)],
            recommended_actions=["Watch for confirmation from volume and follow-through before chasing moves."],
            risk_flags=["overbought"] if (rsi or 0) >= 75 else [],
            raw_score=clip_score(score),
        )

from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SourceRef, SpecialistOutput


class OptionsFlowAgent(BaseSpecialistAgent):
    name = "OptionsFlowAgent"
    category = "options_flow"
    prompt_name = "options_flow"
    allowed_tools = ("get_stock_snapshot", "get_options_snapshot")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        snapshot = context.stock_snapshot or {}
        pcr = snapshot.get("pcr")
        iv = snapshot.get("iv")
        oi_change = snapshot.get("oi_change")
        score = 0.0
        bullish = []
        bearish = []
        neutral = []
        if pcr is not None:
            if pcr >= 1.1:
                bullish.append("Put-call ratio suggests a defensive-to-bullish positioning tilt.")
                score += 12
            elif pcr <= 0.75:
                bearish.append("Put-call ratio suggests more aggressive call-led positioning.")
                score -= 12
        if iv is not None:
            if iv >= 30:
                bearish.append("Implied volatility is elevated, which raises event risk.")
                score -= 8
            else:
                neutral.append("Implied volatility is not especially stretched.")
        if oi_change is not None:
            if oi_change >= 20:
                neutral.append("Open-interest activity is active enough to matter near expiry.")
        if not bullish and not bearish and not neutral:
            neutral.append("Derivatives context is limited in the cached snapshot.")

        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(snapshot),
            category="options_flow",
            headline_summary="Options positioning adds context, but its value depends on data freshness.",
            bullish_factors=bullish[:3],
            bearish_factors=bearish[:3],
            neutral_factors=neutral[:3],
            confidence_score=0.52 if pcr is not None or iv is not None else 0.22,
            importance_score=56 if pcr is not None or iv is not None else 20,
            source_refs=[
                SourceRef(
                    source_type="options_snapshot",
                    source_name="stock_metrics",
                    title=f"{context.symbol} derivatives snapshot",
                    snippet="Latest cached PCR / IV / OI context from stock_metrics.",
                    fetched_at=snapshot.get("updated_at"),
                    reliability_score=0.75,
                )
            ] if pcr is not None or iv is not None else [],
            recommended_actions=["Treat derivatives context as supporting evidence, not the whole thesis."],
            risk_flags=["high_iv"] if (iv or 0) >= 30 else [],
            raw_score=clip_score(score),
            insufficient_evidence=pcr is None and iv is None and oi_change is None,
        )

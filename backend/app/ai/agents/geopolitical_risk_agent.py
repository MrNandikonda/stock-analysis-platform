from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SpecialistOutput


class GeopoliticalRiskAgent(BaseSpecialistAgent):
    name = "GeopoliticalRiskAgent"
    category = "geopolitical_risk"
    prompt_name = "geopolitical_risk"
    allowed_tools = ("get_stock_snapshot", "get_news_items")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        news_items = await context.tool_context.data_access.get_news_items(context.symbol, limit=5)
        keywords = ("tariff", "sanction", "war", "conflict", "election", "ban")
        bearish = []
        for item in news_items:
            content = f"{item.get('title', '')} {item.get('summary', '')}".lower()
            if any(keyword in content for keyword in keywords):
                bearish.append(str(item.get("title") or "Geopolitical headline"))

        insufficient = not bearish
        headline = (
            "Recent headlines introduce some geopolitical uncertainty around the name."
            if bearish
            else "No clear symbol-specific geopolitical signal is visible in the lightweight news set."
        )
        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="geopolitical_risk",
            headline_summary=headline,
            bullish_factors=[],
            bearish_factors=bearish[:3],
            neutral_factors=["Treat geopolitical impact as low-confidence unless external evidence improves."] if not bearish else [],
            confidence_score=0.35 if bearish else 0.18,
            importance_score=48 if bearish else 18,
            recommended_actions=["Keep geopolitical interpretation low-confidence without broader external feeds."],
            risk_flags=["macro_headline_risk"] if bearish else [],
            raw_score=clip_score(-18 if bearish else 0),
            insufficient_evidence=insufficient,
        )

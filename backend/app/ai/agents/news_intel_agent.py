from __future__ import annotations

from statistics import mean

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, dedupe_text, freshness_from_iso, market_from_snapshot
from app.ai.schemas import SourceRef, SpecialistOutput


class NewsIntelAgent(BaseSpecialistAgent):
    name = "NewsIntelAgent"
    category = "news_intel"
    prompt_name = "news_intel"
    allowed_tools = ("get_stock_snapshot", "get_news_items", "get_source_health")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        news_items = await context.tool_context.data_access.get_news_items(context.symbol, limit=6)
        if not news_items:
            return SpecialistOutput(
                symbol=context.symbol,
                market=market_from_snapshot(context.stock_snapshot),
                category="news_intel",
                headline_summary="Recent stock-specific news coverage is thin, so the signal is weak.",
                confidence_score=0.2,
                importance_score=20,
                freshness_minutes=None,
                raw_score=0,
                insufficient_evidence=True,
                neutral_factors=["No recent symbol-specific articles were found in the lightweight RSS set."],
                recommended_actions=["Use price/volume and fundamentals until fresher news arrives."],
            )

        bullish = []
        bearish = []
        neutral = []
        sentiments = []
        source_refs: list[SourceRef] = []
        freshness_values = []
        for item in news_items:
            sentiment = float(item.get("sentiment", 0.0))
            sentiments.append(sentiment)
            title = str(item.get("title", "")).strip() or "Untitled article"
            summary = str(item.get("summary", "")).strip()
            freshness = freshness_from_iso(item.get("published"))
            if freshness is not None:
                freshness_values.append(freshness)
            if sentiment >= 0.25:
                bullish.append(title)
            elif sentiment <= -0.25:
                bearish.append(title)
            else:
                neutral.append(title)
            source_refs.append(
                SourceRef(
                    source_type="news",
                    source_name=str(item.get("source") or "RSS Feed"),
                    url=item.get("link"),
                    title=title,
                    snippet=summary[:280] if summary else title,
                    published_at=item.get("published"),
                    fetched_at=None,
                    freshness_minutes=freshness,
                    reliability_score=0.65,
                )
            )

        avg_sentiment = mean(sentiments) if sentiments else 0.0
        raw_score = clip_score(avg_sentiment * 100)
        confidence = 0.45 if len(news_items) < 2 else 0.62
        importance = min(85.0, 35.0 + len(news_items) * 8.0)
        headline = (
            "Recent coverage tilts positive and may support short-term sentiment."
            if raw_score > 15
            else "Recent coverage is mixed with no strong sentiment edge."
            if raw_score >= -15
            else "Recent coverage skews negative and adds near-term headline risk."
        )
        risk_flags = ["headline_pressure"] if raw_score < -20 else []
        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="news_intel",
            headline_summary=headline,
            bullish_factors=dedupe_text(bullish[:3]),
            bearish_factors=dedupe_text(bearish[:3]),
            neutral_factors=dedupe_text(neutral[:3]),
            confidence_score=round(confidence, 3),
            importance_score=round(importance, 3),
            freshness_minutes=min(freshness_values) if freshness_values else None,
            source_refs=source_refs,
            recommended_actions=["Cross-check any strong headlines against price reaction before acting."],
            risk_flags=risk_flags,
            raw_score=raw_score,
        )

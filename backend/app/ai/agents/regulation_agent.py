from __future__ import annotations

from app.ai.agents.base import AgentExecutionContext, BaseSpecialistAgent
from app.ai.agents.helpers import clip_score, market_from_snapshot
from app.ai.schemas import SourceRef, SpecialistOutput


class RegulationAgent(BaseSpecialistAgent):
    name = "RegulationAgent"
    category = "regulation"
    prompt_name = "regulation"
    allowed_tools = ("get_stock_snapshot", "get_regulatory_notes")

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        notes_payload = await context.tool_context.data_access.get_regulatory_notes(context.symbol)
        notes = notes_payload.get("notes", [])
        source_refs = [SourceRef.model_validate(item) for item in notes_payload.get("source_refs", [])]
        return SpecialistOutput(
            symbol=context.symbol,
            market=market_from_snapshot(context.stock_snapshot),
            category="regulation",
            headline_summary="Regulatory context is generic, so it should temper confidence rather than drive the thesis.",
            bullish_factors=[],
            bearish_factors=[],
            neutral_factors=notes[:3] or ["No specific regulatory event is currently highlighted."],
            confidence_score=0.26,
            importance_score=22,
            source_refs=source_refs,
            recommended_actions=["Verify any market-specific rule changes with official exchange notices when they matter."],
            risk_flags=["regulation_generic_context"] if notes else [],
            raw_score=clip_score(0),
            insufficient_evidence=True,
        )

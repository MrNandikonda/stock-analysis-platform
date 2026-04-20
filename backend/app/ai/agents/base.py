from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.ai.prompt_registry import get_prompt
from app.ai.providers import AIProviderError, BaseAIProvider, ProviderRunResult
from app.ai.schemas import SpecialistOutput
from app.ai.tool_registry import AIToolContext, select_tools


@dataclass(slots=True)
class AgentExecutionContext:
    watchlist_id: int
    watchlist_name: str
    symbol: str
    provider: BaseAIProvider
    model_name: str
    tool_context: AIToolContext
    stock_snapshot: dict[str, Any] | None


class BaseSpecialistAgent:
    name = "base"
    category = "source_health"
    prompt_name = "source_health"
    allowed_tools: tuple[str, ...] = ()
    reasoning_effort = "low"

    async def analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        provider = context.provider
        health = provider.health_check()
        prompt = get_prompt(self.prompt_name)

        if provider.supports_remote_inference and health.ready:
            try:
                tools = select_tools(context.tool_context, list(self.allowed_tools))
                payload = {
                    "watchlist": {"id": context.watchlist_id, "name": context.watchlist_name},
                    "symbol": context.symbol,
                    "snapshot": context.stock_snapshot,
                    "category": self.category,
                }
                result = await provider.generate_structured_output(
                    model_name=context.model_name,
                    instructions=prompt.instructions,
                    payload=payload,
                    output_model=SpecialistOutput,
                    tools=tools,
                    reasoning_effort=self.reasoning_effort,
                )
                output = SpecialistOutput.model_validate(result.payload)
                output.model_metadata.update(self._run_metadata(result, prompt.version))
                return output
            except AIProviderError:
                pass

        output = await self.heuristic_analyze(context)
        output.model_metadata.update(
            {
                "provider_name": provider.name,
                "model_name": context.model_name,
                "prompt_version": prompt.version,
                "mode": "heuristic",
            }
        )
        return output

    async def heuristic_analyze(self, context: AgentExecutionContext) -> SpecialistOutput:
        raise NotImplementedError

    def _run_metadata(self, result: ProviderRunResult, prompt_version: str) -> dict[str, Any]:
        return {
            "provider_name": result.provider_name,
            "model_name": result.model_name,
            "prompt_version": prompt_version,
            "input_tokens": result.input_tokens,
            "output_tokens": result.output_tokens,
            "used_tools": result.used_tools or [],
            "mode": "llm",
        }

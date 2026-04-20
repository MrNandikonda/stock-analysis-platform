from __future__ import annotations

from pydantic import BaseModel

from app.ai.providers.base import AIProviderError, BaseAIProvider, ProviderHealth, ProviderRunResult, ProviderTool


class LocalSummaryProvider(BaseAIProvider):
    name = "local-summary"

    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled

    def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider_name=self.name,
            enabled=self.enabled,
            ready=self.enabled,
            status="ready" if self.enabled else "disabled",
            message="Deterministic local fallback is available." if self.enabled else "AI analysis is disabled.",
        )

    async def generate_structured_output(
        self,
        *,
        model_name: str,
        instructions: str,
        payload: dict[str, object],
        output_model: type[BaseModel],
        tools: list[ProviderTool] | None = None,
        reasoning_effort: str = "low",
        max_tool_rounds: int = 3,
    ) -> ProviderRunResult:
        raise AIProviderError("Local summary provider does not execute remote structured generation.")

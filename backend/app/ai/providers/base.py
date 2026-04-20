from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from pydantic import BaseModel


class AIProviderError(RuntimeError):
    pass


@dataclass(slots=True)
class ProviderHealth:
    provider_name: str
    enabled: bool
    ready: bool
    status: str
    message: str
    model_orchestrator: str | None = None
    model_specialist: str | None = None
    model_summarizer: str | None = None
    supports_tool_calling: bool = False
    supports_background_mode: bool = False


@dataclass(slots=True)
class ProviderTool:
    name: str
    description: str
    parameters_schema: dict[str, Any]
    handler: Callable[[dict[str, Any]], Awaitable[Any]]
    read_only: bool = True

    def as_openai_tool(self) -> dict[str, Any]:
        return {
            "type": "function",
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters_schema,
            "strict": True,
        }


@dataclass(slots=True)
class ProviderRunResult:
    payload: dict[str, Any]
    provider_name: str
    model_name: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    used_tools: list[str] | None = None


class BaseAIProvider:
    name = "base"
    supports_tool_calling = False
    supports_background_mode = False
    supports_remote_inference = False

    def health_check(self) -> ProviderHealth:
        raise NotImplementedError

    async def generate_structured_output(
        self,
        *,
        model_name: str,
        instructions: str,
        payload: dict[str, Any],
        output_model: type[BaseModel],
        tools: list[ProviderTool] | None = None,
        reasoning_effort: str = "low",
        max_tool_rounds: int = 3,
    ) -> ProviderRunResult:
        raise NotImplementedError

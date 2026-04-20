from __future__ import annotations

import asyncio
import json
from typing import Any

from openai import OpenAI
from pydantic import BaseModel

from app.ai.providers.base import AIProviderError, BaseAIProvider, ProviderHealth, ProviderRunResult, ProviderTool


class OpenAIProvider(BaseAIProvider):
    name = "openai"
    supports_tool_calling = True
    supports_background_mode = True
    supports_remote_inference = True

    def __init__(
        self,
        *,
        api_key: str | None,
        base_url: str | None,
        enabled: bool,
        model_orchestrator: str,
        model_specialist: str,
        model_summarizer: str,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.enabled = enabled
        self.model_orchestrator = model_orchestrator
        self.model_specialist = model_specialist
        self.model_summarizer = model_summarizer
        self._client: OpenAI | None = None

    def health_check(self) -> ProviderHealth:
        if not self.enabled:
            return ProviderHealth(
                provider_name=self.name,
                enabled=False,
                ready=False,
                status="disabled",
                message="OpenAI provider is disabled by configuration.",
                model_orchestrator=self.model_orchestrator,
                model_specialist=self.model_specialist,
                model_summarizer=self.model_summarizer,
                supports_tool_calling=self.supports_tool_calling,
                supports_background_mode=self.supports_background_mode,
            )
        if not self.api_key:
            return ProviderHealth(
                provider_name=self.name,
                enabled=True,
                ready=False,
                status="missing_api_key",
                message="OPENAI_API_KEY is not configured.",
                model_orchestrator=self.model_orchestrator,
                model_specialist=self.model_specialist,
                model_summarizer=self.model_summarizer,
                supports_tool_calling=self.supports_tool_calling,
                supports_background_mode=self.supports_background_mode,
            )
        return ProviderHealth(
            provider_name=self.name,
            enabled=True,
            ready=True,
            status="ready",
            message="OpenAI Responses API is configured.",
            model_orchestrator=self.model_orchestrator,
            model_specialist=self.model_specialist,
            model_summarizer=self.model_summarizer,
            supports_tool_calling=self.supports_tool_calling,
            supports_background_mode=self.supports_background_mode,
        )

    def _get_client(self) -> OpenAI:
        if self._client is None:
            if not self.api_key:
                raise AIProviderError("OPENAI_API_KEY is not configured.")
            self._client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        return self._client

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
        health = self.health_check()
        if not health.ready:
            raise AIProviderError(health.message)

        tool_map = {tool.name: tool for tool in tools or []}
        response = await self._create_response(
            model_name=model_name,
            instructions=instructions,
            payload=payload,
            output_model=output_model,
            tools=tools or [],
            reasoning_effort=reasoning_effort,
        )
        used_tools: list[str] = []

        for _ in range(max_tool_rounds):
            function_calls = self._extract_function_calls(response)
            if not function_calls:
                break

            tool_outputs: list[dict[str, str]] = []
            for call in function_calls:
                tool = tool_map.get(call["name"])
                if tool is None:
                    raise AIProviderError(f"Tool '{call['name']}' was requested but is not registered.")
                arguments = json.loads(call["arguments"] or "{}")
                result = await tool.handler(arguments)
                tool_outputs.append(
                    {
                        "type": "function_call_output",
                        "call_id": call["call_id"],
                        "output": json.dumps(result, ensure_ascii=True),
                    }
                )
                used_tools.append(tool.name)

            response = await self._create_follow_up_response(
                model_name=model_name,
                previous_response_id=getattr(response, "id"),
                tool_outputs=tool_outputs,
                output_model=output_model,
                tools=tools or [],
                reasoning_effort=reasoning_effort,
            )

        output_text = (getattr(response, "output_text", "") or "").strip()
        if not output_text:
            raise AIProviderError("OpenAI response did not return structured output text.")

        try:
            payload_dict = json.loads(output_text)
            validated = output_model.model_validate(payload_dict)
        except Exception as exc:  # pragma: no cover - defensive parsing path
            raise AIProviderError(f"Failed to validate model output: {exc}") from exc

        usage = getattr(response, "usage", None)
        input_tokens = getattr(usage, "input_tokens", None) if usage is not None else None
        output_tokens = getattr(usage, "output_tokens", None) if usage is not None else None

        return ProviderRunResult(
            payload=validated.model_dump(mode="json"),
            provider_name=self.name,
            model_name=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            used_tools=used_tools,
        )

    async def _create_response(
        self,
        *,
        model_name: str,
        instructions: str,
        payload: dict[str, Any],
        output_model: type[BaseModel],
        tools: list[ProviderTool],
        reasoning_effort: str,
    ):
        kwargs = self._build_response_kwargs(
            model_name=model_name,
            input_payload=[
                {"role": "developer", "content": instructions},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
            ],
            output_model=output_model,
            tools=tools,
            reasoning_effort=reasoning_effort,
        )
        return await asyncio.to_thread(self._get_client().responses.create, **kwargs)

    async def _create_follow_up_response(
        self,
        *,
        model_name: str,
        previous_response_id: str | None,
        tool_outputs: list[dict[str, str]],
        output_model: type[BaseModel],
        tools: list[ProviderTool],
        reasoning_effort: str,
    ):
        kwargs = self._build_response_kwargs(
            model_name=model_name,
            input_payload=tool_outputs,
            output_model=output_model,
            tools=tools,
            reasoning_effort=reasoning_effort,
        )
        if previous_response_id:
            kwargs["previous_response_id"] = previous_response_id
        return await asyncio.to_thread(self._get_client().responses.create, **kwargs)

    def _build_response_kwargs(
        self,
        *,
        model_name: str,
        input_payload: list[dict[str, Any]],
        output_model: type[BaseModel],
        tools: list[ProviderTool],
        reasoning_effort: str,
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": model_name,
            "input": input_payload,
            "text": {
                "verbosity": "low",
                "format": {
                    "type": "json_schema",
                    "name": output_model.__name__,
                    "schema": output_model.model_json_schema(),
                    "strict": True,
                },
            },
        }
        if tools:
            kwargs["tools"] = [tool.as_openai_tool() for tool in tools]
        if reasoning_effort:
            kwargs["reasoning"] = {"effort": reasoning_effort}
        return kwargs

    def _extract_function_calls(self, response) -> list[dict[str, str]]:
        function_calls: list[dict[str, str]] = []
        for item in getattr(response, "output", []) or []:
            item_type = getattr(item, "type", None)
            if item_type != "function_call":
                continue
            function_calls.append(
                {
                    "call_id": getattr(item, "call_id", ""),
                    "name": getattr(item, "name", ""),
                    "arguments": getattr(item, "arguments", "") or "{}",
                }
            )
        return function_calls

from __future__ import annotations

from app.ai.providers.base import BaseAIProvider
from app.ai.providers.local_provider import LocalSummaryProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.core.config import get_settings


class AIProviderRegistry:
    def __init__(self) -> None:
        self.settings = get_settings()

    def build(self, provider_name: str | None = None) -> BaseAIProvider:
        selected = provider_name or self.settings.ai_default_provider
        if selected == "openai":
            return OpenAIProvider(
                api_key=self.settings.openai_api_key,
                base_url=self.settings.openai_api_base_url,
                enabled=self.settings.ai_analysis_enabled,
                model_orchestrator=self.settings.openai_model_orchestrator,
                model_specialist=self.settings.openai_model_specialist,
                model_summarizer=self.settings.openai_model_summarizer,
            )
        return LocalSummaryProvider(enabled=self.settings.ai_analysis_enabled)

    def list_all(self) -> list[BaseAIProvider]:
        return [self.build("openai"), self.build("local-summary")]

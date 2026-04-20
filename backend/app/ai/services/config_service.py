from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import AIProviderRegistry
from app.ai.schemas import AIProviderStatus, AIStatusResponse, ALL_AGENT_CATEGORIES
from app.core.config import get_settings
from app.models.ai_entities import AIProviderConfig


@dataclass(slots=True)
class ResolvedProviderConfig:
    provider_name: str
    orchestrator_model: str
    specialist_model: str
    summarizer_model: str


class AIConfigService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = get_settings()
        self.registry = AIProviderRegistry()

    async def sync_provider_defaults(self) -> None:
        defaults = {
            "openai": {
                "enabled": bool(self.settings.ai_analysis_enabled and self.settings.openai_api_key),
                "priority": 10,
                "api_base_url": self.settings.openai_api_base_url,
                "model_orchestrator": self.settings.openai_model_orchestrator,
                "model_specialist": self.settings.openai_model_specialist,
                "model_summarizer": self.settings.openai_model_summarizer,
            },
            "local-summary": {
                "enabled": self.settings.ai_analysis_enabled,
                "priority": 100,
                "api_base_url": None,
                "model_orchestrator": "deterministic-template",
                "model_specialist": "deterministic-template",
                "model_summarizer": "deterministic-template",
            },
        }

        existing_rows = (
            await self.session.execute(select(AIProviderConfig).where(AIProviderConfig.provider_name.in_(tuple(defaults.keys()))))
        ).scalars().all()
        existing_by_name = {row.provider_name: row for row in existing_rows}

        for provider_name, payload in defaults.items():
            row = existing_by_name.get(provider_name)
            if row is None:
                row = AIProviderConfig(provider_name=provider_name)
                self.session.add(row)
            row.enabled = payload["enabled"]
            row.priority = payload["priority"]
            row.api_base_url = payload["api_base_url"]
            row.model_orchestrator = payload["model_orchestrator"]
            row.model_specialist = payload["model_specialist"]
            row.model_summarizer = payload["model_summarizer"]

        await self.session.flush()

    async def list_provider_statuses(self) -> list[AIProviderStatus]:
        await self.sync_provider_defaults()
        rows = (await self.session.execute(select(AIProviderConfig).order_by(AIProviderConfig.priority.asc()))).scalars().all()
        statuses: list[AIProviderStatus] = []
        for row in rows:
            provider = self.registry.build(row.provider_name)
            health = provider.health_check()
            statuses.append(
                AIProviderStatus(
                    provider_name=row.provider_name,
                    enabled=row.enabled,
                    ready=health.ready if row.enabled else False,
                    status=health.status if row.enabled else "disabled",
                    message=health.message if row.enabled else "Provider is disabled.",
                    model_orchestrator=row.model_orchestrator,
                    model_specialist=row.model_specialist,
                    model_summarizer=row.model_summarizer,
                    supports_tool_calling=health.supports_tool_calling,
                    supports_background_mode=health.supports_background_mode,
                )
            )
        return statuses

    async def resolve_provider(self, preferred_provider_name: str | None = None) -> ResolvedProviderConfig:
        await self.sync_provider_defaults()
        rows = (await self.session.execute(select(AIProviderConfig).order_by(AIProviderConfig.priority.asc()))).scalars().all()
        rows_by_name = {row.provider_name: row for row in rows}

        selected_name = preferred_provider_name or self.settings.ai_default_provider
        selected_row = rows_by_name.get(selected_name)
        if selected_row and selected_row.enabled and self.registry.build(selected_name).health_check().ready:
            return ResolvedProviderConfig(
                provider_name=selected_row.provider_name,
                orchestrator_model=selected_row.model_orchestrator or self.settings.openai_model_orchestrator,
                specialist_model=selected_row.model_specialist or self.settings.openai_model_specialist,
                summarizer_model=selected_row.model_summarizer or self.settings.openai_model_summarizer,
            )

        for row in rows:
            provider = self.registry.build(row.provider_name)
            if row.enabled and provider.health_check().ready:
                return ResolvedProviderConfig(
                    provider_name=row.provider_name,
                    orchestrator_model=row.model_orchestrator or self.settings.openai_model_orchestrator,
                    specialist_model=row.model_specialist or self.settings.openai_model_specialist,
                    summarizer_model=row.model_summarizer or self.settings.openai_model_summarizer,
                )

        return ResolvedProviderConfig(
            provider_name="local-summary",
            orchestrator_model="deterministic-template",
            specialist_model="deterministic-template",
            summarizer_model="deterministic-template",
        )

    async def get_status_response(self) -> AIStatusResponse:
        return AIStatusResponse(
            ai_analysis_enabled=self.settings.ai_analysis_enabled,
            default_provider=self.settings.ai_default_provider,
            background_mode_enabled=self.settings.ai_background_mode_enabled,
            web_search_enabled=self.settings.ai_web_search_enabled,
            available_categories=list(ALL_AGENT_CATEGORIES),
            providers=await self.list_provider_statuses(),
        )

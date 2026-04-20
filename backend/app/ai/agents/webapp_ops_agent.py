from __future__ import annotations

from app.ai.prompt_registry import get_prompt


class WebAppOpsAgent:
    name = "WebAppOpsAgent"

    def summarize(self, diagnostics: dict, provider_messages: list[str]) -> str:
        prompt = get_prompt("webapp_ops")
        recent_failures = diagnostics.get("recent_failures", [])
        recent_jobs = diagnostics.get("recent_jobs", [])
        failure_count = len(recent_failures)
        job_count = len(recent_jobs)
        status_bits = [
            f"{job_count} recent job(s) inspected",
            f"{failure_count} recent failure(s)",
        ]
        if provider_messages:
            status_bits.extend(provider_messages)
        return f"{prompt.name}: " + "; ".join(status_bits) + "."

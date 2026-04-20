from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.ai.schemas import SourceRef


def clip_score(value: float, lower: float = -100, upper: float = 100) -> float:
    return max(lower, min(upper, round(value, 3)))


def dedupe_text(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        cleaned = value.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        result.append(cleaned)
    return result


def market_from_snapshot(snapshot: dict[str, Any] | None) -> str:
    if not snapshot:
        return "US"
    return "NSE" if snapshot.get("exchange") == "NSE" else "US"


def freshness_from_iso(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return max(0, int((datetime.now(UTC) - parsed.astimezone(UTC)).total_seconds() // 60))
    except ValueError:
        return None


def source_ref_from_market_data(symbol: str, snippet: str, updated_at: str | None) -> SourceRef:
    return SourceRef(
        source_type="market_data",
        source_name="stock_metrics",
        title=f"{symbol.upper()} market snapshot",
        snippet=snippet,
        fetched_at=updated_at,
        freshness_minutes=freshness_from_iso(updated_at),
        reliability_score=0.9,
    )

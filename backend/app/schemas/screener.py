from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ScreenerFilter(BaseModel):
    field: str
    operator: Literal[
        "eq",
        "neq",
        "lt",
        "lte",
        "gt",
        "gte",
        "between",
        "contains",
        "in",
        "gt_field",
        "lt_field",
    ]
    value: Any


class ScreenerQuery(BaseModel):
    market: Literal["ALL", "NSE", "US"] = "ALL"
    logic: Literal["AND", "OR"] = "AND"
    filters: list[ScreenerFilter] = Field(default_factory=list)
    sort_by: str = "updated_at"
    sort_order: Literal["asc", "desc"] = "desc"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class SavePresetRequest(BaseModel):
    name: str
    query: ScreenerQuery


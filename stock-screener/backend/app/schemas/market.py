from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QuoteItem(BaseModel):
    symbol: str
    name: str
    exchange: str
    asset_type: str
    price: float
    change_1d: float | None = None
    change_5d: float | None = None
    change_1m: float | None = None
    change_3m: float | None = None
    change_1y: float | None = None
    volume: float | None = None
    avg_volume_20d: float | None = None
    volume_spike: float | None = None
    pe: float | None = None
    pb: float | None = None
    peg: float | None = None
    ev_ebitda: float | None = None
    dividend_yield: float | None = None
    roe: float | None = None
    roce: float | None = None
    debt_equity: float | None = None
    profit_margin: float | None = None
    revenue_growth: float | None = None
    rsi_14: float | None = None
    macd: float | None = None
    macd_signal: float | None = None
    sma_50: float | None = None
    sma_200: float | None = None
    oi_change: float | None = None
    pcr: float | None = None
    iv: float | None = None
    updated_at: str
    market_cap: float | None = None
    sector: str | None = None
    industry: str | None = None


class QuotesResponse(BaseModel):
    items: list[QuoteItem]
    total: int
    page: int
    page_size: int = Field(le=100)


class HistoryItem(BaseModel):
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class MarketStatusResponse(BaseModel):
    timestamp_utc: str
    nse: dict[str, Any]
    nyse: dict[str, Any]


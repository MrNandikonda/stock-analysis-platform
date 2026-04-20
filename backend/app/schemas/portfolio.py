from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class PortfolioHoldingRequest(BaseModel):
    symbol: str
    quantity: float = Field(gt=0)
    avg_price: float = Field(gt=0)
    buy_date: date
    asset_class: str = "equity"


class ImportPortfolioCsvRequest(BaseModel):
    csv_data: str


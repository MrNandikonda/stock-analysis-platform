from __future__ import annotations

from pydantic import BaseModel, Field


class CreateWatchlistRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class AddWatchlistItemsRequest(BaseModel):
    symbols: list[str]


class ImportWatchlistCsvRequest(BaseModel):
    csv_data: str


class CreateAlertRequest(BaseModel):
    symbol: str
    condition: str
    target_value: float


import pytest

from app.schemas.screener import SavePresetRequest, ScreenerFilter, ScreenerQuery
from app.services.screener_service import ScreenerService


@pytest.mark.asyncio
async def test_screener_and_logic(seeded_session):
    service = ScreenerService(seeded_session)
    query = ScreenerQuery(
        market="NSE",
        logic="AND",
        filters=[
            ScreenerFilter(field="pe", operator="lt", value=20),
            ScreenerFilter(field="roe", operator="gt", value=10),
        ],
    )
    result = await service.run(query)
    assert result["total"] == 1
    assert result["items"][0]["symbol"] == "AAA"


@pytest.mark.asyncio
async def test_screener_or_logic(seeded_session):
    service = ScreenerService(seeded_session)
    query = ScreenerQuery(
        market="ALL",
        logic="OR",
        filters=[
            ScreenerFilter(field="symbol", operator="eq", value="BBB"),
            ScreenerFilter(field="change_1m", operator="gt", value=10),
        ],
        sort_by="symbol",
        sort_order="asc",
    )
    result = await service.run(query)
    symbols = [item["symbol"] for item in result["items"]]
    assert symbols == ["AAA", "BBB", "CCC"]


@pytest.mark.asyncio
async def test_gt_field_operator(seeded_session):
    service = ScreenerService(seeded_session)
    query = ScreenerQuery(
        market="ALL",
        logic="AND",
        filters=[ScreenerFilter(field="macd", operator="gt_field", value="macd_signal")],
    )
    result = await service.run(query)
    symbols = {item["symbol"] for item in result["items"]}
    assert symbols == {"AAA", "CCC"}


@pytest.mark.asyncio
async def test_preset_save_and_list(seeded_session):
    service = ScreenerService(seeded_session)
    payload = SavePresetRequest(
        name="My Test Preset",
        query=ScreenerQuery(
            market="US",
            logic="AND",
            filters=[ScreenerFilter(field="price", operator="gt", value=100)],
        ),
    )
    saved = await service.save_preset(payload)
    await seeded_session.commit()
    listed = await service.list_presets()
    assert saved["name"] == "My Test Preset"
    assert any(item["name"] == "My Test Preset" for item in listed)


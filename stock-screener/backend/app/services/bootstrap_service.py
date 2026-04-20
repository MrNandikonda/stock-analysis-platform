from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import ScreenerPreset, Stock, Watchlist, WatchlistItem


SEED_STOCKS = [
    ("RELIANCE", "NSE", "Reliance Industries", "Energy", "Oil & Gas", 241_000_000_000, "EQUITY"),
    ("TCS", "NSE", "Tata Consultancy Services", "Technology", "IT Services", 171_000_000_000, "EQUITY"),
    ("INFY", "NSE", "Infosys", "Technology", "IT Services", 74_000_000_000, "EQUITY"),
    ("HDFCBANK", "NSE", "HDFC Bank", "Financials", "Banks", 129_000_000_000, "EQUITY"),
    ("ICICIBANK", "NSE", "ICICI Bank", "Financials", "Banks", 92_000_000_000, "EQUITY"),
    ("SBIN", "NSE", "State Bank of India", "Financials", "Banks", 68_000_000_000, "EQUITY"),
    ("NIFTY50", "NSE", "NIFTY 50", "Index", "Index", 0, "INDEX"),
    ("BANKNIFTY", "NSE", "NIFTY BANK", "Index", "Index", 0, "INDEX"),
    ("SPY", "NASDAQ", "SPDR S&P 500 ETF", "ETF", "Broad Market ETF", 510_000_000_000, "ETF"),
    ("QQQ", "NASDAQ", "Invesco QQQ Trust", "ETF", "Nasdaq ETF", 258_000_000_000, "ETF"),
    ("AAPL", "NASDAQ", "Apple Inc.", "Technology", "Consumer Electronics", 2_850_000_000_000, "EQUITY"),
    ("MSFT", "NASDAQ", "Microsoft Corporation", "Technology", "Software", 2_750_000_000_000, "EQUITY"),
    ("NVDA", "NASDAQ", "NVIDIA Corporation", "Technology", "Semiconductors", 2_200_000_000_000, "EQUITY"),
    ("AMZN", "NASDAQ", "Amazon.com, Inc.", "Consumer", "E-Commerce", 1_850_000_000_000, "EQUITY"),
    ("GOOGL", "NASDAQ", "Alphabet Inc.", "Technology", "Internet Services", 1_950_000_000_000, "EQUITY"),
    ("META", "NASDAQ", "Meta Platforms", "Technology", "Internet Services", 1_350_000_000_000, "EQUITY"),
    ("TSLA", "NASDAQ", "Tesla, Inc.", "Automotive", "EV", 740_000_000_000, "EQUITY"),
    ("JPM", "NYSE", "JPMorgan Chase & Co.", "Financials", "Banks", 585_000_000_000, "EQUITY"),
    ("XOM", "NYSE", "Exxon Mobil Corporation", "Energy", "Oil & Gas", 520_000_000_000, "EQUITY"),
    ("^GSPC", "NYSE", "S&P 500 Index", "Index", "Index", 0, "INDEX"),
]

SEED_PRESETS = [
    (
        "Value Stocks India",
        {
            "market": "NSE",
            "logic": "AND",
            "filters": [
                {"field": "pe", "operator": "lt", "value": 20},
                {"field": "roe", "operator": "gt", "value": 15},
                {"field": "debt_equity", "operator": "lt", "value": 1.0},
            ],
            "sort_by": "roe",
            "sort_order": "desc",
        },
    ),
    (
        "US Momentum",
        {
            "market": "US",
            "logic": "AND",
            "filters": [
                {"field": "change_1m", "operator": "gt", "value": 8},
                {"field": "rsi_14", "operator": "between", "value": [50, 75]},
                {"field": "volume_spike", "operator": "gt", "value": 1.2},
            ],
            "sort_by": "change_1m",
            "sort_order": "desc",
        },
    ),
    (
        "High Dividend NSE",
        {
            "market": "NSE",
            "logic": "AND",
            "filters": [
                {"field": "dividend_yield", "operator": "gt", "value": 2.5},
                {"field": "market_cap", "operator": "gt", "value": 50_000_000_000},
            ],
            "sort_by": "dividend_yield",
            "sort_order": "desc",
        },
    ),
    (
        "F&O Bullish Setup",
        {
            "market": "NSE",
            "logic": "AND",
            "filters": [
                {"field": "pcr", "operator": "gt", "value": 1.0},
                {"field": "oi_change", "operator": "gt", "value": 2},
                {"field": "macd", "operator": "gt_field", "value": "macd_signal"},
            ],
            "sort_by": "oi_change",
            "sort_order": "desc",
        },
    ),
    (
        "ETF Stability",
        {
            "market": "ALL",
            "logic": "AND",
            "filters": [
                {"field": "asset_type", "operator": "eq", "value": "ETF"},
                {"field": "change_1d", "operator": "between", "value": [-2.0, 2.0]},
            ],
            "sort_by": "price",
            "sort_order": "desc",
        },
    ),
]


async def bootstrap_data(session: AsyncSession) -> None:
    await _seed_stocks(session)
    await _seed_presets(session)
    await _seed_watchlists(session)


async def _seed_stocks(session: AsyncSession) -> None:
    existing_symbols = set((await session.execute(select(Stock.symbol))).scalars().all())
    for stock in SEED_STOCKS:
        symbol = stock[0]
        if symbol in existing_symbols:
            continue
        session.add(
            Stock(
                symbol=symbol,
                exchange=stock[1],
                name=stock[2],
                sector=stock[3],
                industry=stock[4],
                market_cap=stock[5],
                asset_type=stock[6],
            )
        )


async def _seed_presets(session: AsyncSession) -> None:
    existing_presets = set((await session.execute(select(ScreenerPreset.name))).scalars().all())
    for preset_name, payload in SEED_PRESETS:
        if preset_name in existing_presets:
            continue
        session.add(
            ScreenerPreset(
                user_id="local",
                name=preset_name,
                filter_json=json.dumps(payload),
            )
        )


async def _seed_watchlists(session: AsyncSession) -> None:
    existing = (await session.execute(select(Watchlist).where(Watchlist.user_id == "local"))).scalars().all()
    if existing:
        return

    india = Watchlist(user_id="local", name="Indian Banking")
    us_tech = Watchlist(user_id="local", name="US Tech")
    portfolio = Watchlist(user_id="local", name="My Portfolio")
    session.add_all([india, us_tech, portfolio])
    await session.flush()

    session.add_all(
        [
            WatchlistItem(watchlist_id=india.id, symbol="HDFCBANK"),
            WatchlistItem(watchlist_id=india.id, symbol="ICICIBANK"),
            WatchlistItem(watchlist_id=india.id, symbol="SBIN"),
            WatchlistItem(watchlist_id=us_tech.id, symbol="AAPL"),
            WatchlistItem(watchlist_id=us_tech.id, symbol="MSFT"),
            WatchlistItem(watchlist_id=us_tech.id, symbol="NVDA"),
            WatchlistItem(watchlist_id=portfolio.id, symbol="RELIANCE"),
            WatchlistItem(watchlist_id=portfolio.id, symbol="AAPL"),
            WatchlistItem(watchlist_id=portfolio.id, symbol="SPY"),
        ]
    )


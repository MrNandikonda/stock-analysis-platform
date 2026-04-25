from __future__ import annotations

import asyncio

from app.core.database import async_session_factory
from app.services.watchlist_service import WatchlistService

WATCHLISTS: dict[str, list[str]] = {
    "Indian Banking": ["HDFCBANK", "ICICIBANK", "SBIN"],
    "My Portfolio": ["AAPL", "RELIANCE", "SPY"],
    "US Tech": ["AAPL", "MSFT", "NVDA"],
}


async def seed() -> None:
    async with async_session_factory() as session:
        svc = WatchlistService(session)
        existing = await svc.list_watchlists()
        existing_names = [w["name"] for w in existing]

        for name, symbols in WATCHLISTS.items():
            if name in existing_names:
                wl = next((w for w in existing if w["name"] == name), None)
                watchlist_id = wl["id"] if wl else None
                print(f"Watchlist '{name}' exists (id={watchlist_id}), ensuring symbols present...")
            else:
                created = await svc.create_watchlist(name)
                watchlist_id = created["id"]
                print(f"Created watchlist '{name}' id={watchlist_id}")

            if watchlist_id is None:
                print(f"Skipping {name}: unable to determine watchlist id")
                continue

            inserted = await svc.add_items(watchlist_id, symbols)
            print(f"Inserted {inserted} symbols into '{name}': {', '.join(symbols)}")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())

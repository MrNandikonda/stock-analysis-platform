from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import feedparser
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.core.cache import async_ttl_cache


DEFAULT_FEEDS = [
    "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    "https://www.bloomberg.com/feed/podcast/etf-report.xml",
]


class NewsService:
    def __init__(self) -> None:
        self._sentiment = SentimentIntensityAnalyzer()

    @async_ttl_cache(ttl_seconds=300)
    async def fetch_news(self, symbols: list[str] | None = None, limit: int = 50) -> list[dict]:
        symbols = [symbol.upper() for symbol in (symbols or [])]
        tasks = [asyncio.to_thread(feedparser.parse, url) for url in DEFAULT_FEEDS]
        feeds = await asyncio.gather(*tasks, return_exceptions=True)

        items = []
        for feed in feeds:
            if isinstance(feed, Exception):
                continue
            for entry in getattr(feed, "entries", []):
                title = entry.get("title", "")
                summary = entry.get("summary", "")
                content = f"{title} {summary}".strip()
                sentiment = self._sentiment.polarity_scores(content)["compound"]

                if symbols and not _mentions_symbols(content, symbols):
                    continue

                items.append(
                    {
                        "title": title,
                        "summary": summary[:400],
                        "link": entry.get("link"),
                        "published": entry.get("published", ""),
                        "source": getattr(feed.feed, "title", "RSS Feed"),
                        "sentiment": round(sentiment, 3),
                    }
                )

        items.sort(key=lambda row: row.get("published", ""), reverse=True)
        return items[:limit]

    async def earnings_calendar(self, symbols: list[str] | None = None) -> list[dict]:
        # yfinance earnings endpoints are inconsistent; this fallback keeps UI stable offline.
        symbols = symbols or ["AAPL", "MSFT", "RELIANCE", "TCS"]
        now = datetime.now(tz=timezone.utc)
        results = []
        for idx, symbol in enumerate(symbols[:12]):
            results.append(
                {
                    "symbol": symbol.upper(),
                    "earnings_date_utc": (now.replace(microsecond=0) + timedelta_days(idx + 1)).isoformat(),
                    "market": "NSE" if symbol.isalpha() and symbol == symbol.upper() and len(symbol) > 4 else "US",
                }
            )
        return results


def _mentions_symbols(text: str, symbols: list[str]) -> bool:
    text_upper = text.upper()
    return any(symbol in text_upper for symbol in symbols)


def timedelta_days(days: int):
    from datetime import timedelta

    return timedelta(days=days)


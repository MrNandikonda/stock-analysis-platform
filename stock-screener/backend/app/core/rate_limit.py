from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field


class RateLimitError(RuntimeError):
    """Raised when a data-source bucket has no tokens available."""


@dataclass
class TokenBucket:
    capacity: float
    refill_per_second: float
    tokens: float = field(init=False)
    last_refill: float = field(init=False, default_factory=time.monotonic)
    lock: asyncio.Lock = field(init=False, default_factory=asyncio.Lock)

    def __post_init__(self) -> None:
        self.tokens = self.capacity

    def _refill(self, now: float) -> None:
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_second)
        self.last_refill = now

    async def acquire(self, tokens: float = 1.0) -> bool:
        async with self.lock:
            now = time.monotonic()
            self._refill(now)
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False


class DataSourceRateLimiter:
    def __init__(self, yfinance_hourly_limit: int) -> None:
        self._buckets: dict[str, TokenBucket] = {
            "yfinance": TokenBucket(
                capacity=float(yfinance_hourly_limit),
                refill_per_second=float(yfinance_hourly_limit) / 3600.0,
            ),
            "nse": TokenBucket(capacity=120.0, refill_per_second=2.0),
        }

    async def acquire(self, source: str, tokens: float = 1.0) -> None:
        bucket = self._buckets[source]
        allowed = await bucket.acquire(tokens=tokens)
        if not allowed:
            raise RateLimitError(f"Rate limit exceeded for {source}")

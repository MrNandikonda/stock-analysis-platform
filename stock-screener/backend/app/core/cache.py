from __future__ import annotations

from aiocache import Cache, caches
from aiocache.decorators import cached
from aiocache.serializers import PickleSerializer


def initialize_cache() -> None:
    caches.set_config(
        {
            "default": {
                "cache": "aiocache.SimpleMemoryCache",
                "serializer": {"class": "aiocache.serializers.PickleSerializer"},
            }
        }
    )


def async_ttl_cache(ttl_seconds: int = 300):
    return cached(ttl=ttl_seconds, cache=Cache.MEMORY, serializer=PickleSerializer())


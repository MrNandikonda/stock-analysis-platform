from __future__ import annotations

import math


def _safe_slice(values: list[float], length: int) -> list[float]:
    return values[-length:] if len(values) >= length else values[:]


def sma(values: list[float], period: int) -> float | None:
    window = _safe_slice(values, period)
    if len(window) < period:
        return None
    return sum(window) / period


def ema(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    k = 2 / (period + 1)
    ema_value = sum(values[:period]) / period
    for price in values[period:]:
        ema_value = price * k + ema_value * (1 - k)
    return ema_value


def rsi(values: list[float], period: int = 14) -> float | None:
    if len(values) <= period:
        return None
    gains = []
    losses = []
    for idx in range(1, len(values)):
        diff = values[idx] - values[idx - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    if avg_loss == 0:
        return 100.0

    for idx in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[idx]) / period
        avg_loss = (avg_loss * (period - 1) + losses[idx]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def macd(values: list[float], fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[float | None, float | None]:
    if len(values) < slow + signal:
        return None, None

    fast_ema = []
    slow_ema = []
    for i in range(1, len(values) + 1):
        fast_value = ema(values[:i], fast)
        slow_value = ema(values[:i], slow)
        fast_ema.append(fast_value)
        slow_ema.append(slow_value)

    macd_line = []
    for f, s in zip(fast_ema, slow_ema):
        if f is not None and s is not None:
            macd_line.append(f - s)

    signal_line = ema(macd_line, signal)
    return (macd_line[-1] if macd_line else None, signal_line)


def bollinger_bands(values: list[float], period: int = 20, multiplier: float = 2.0) -> tuple[float | None, float | None, float | None]:
    window = _safe_slice(values, period)
    if len(window) < period:
        return None, None, None
    mean = sum(window) / period
    variance = sum((x - mean) ** 2 for x in window) / period
    std = math.sqrt(variance)
    upper = mean + multiplier * std
    lower = mean - multiplier * std
    return upper, mean, lower


def stochastic(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> float | None:
    if len(closes) < period or len(highs) < period or len(lows) < period:
        return None
    highest_high = max(highs[-period:])
    lowest_low = min(lows[-period:])
    close = closes[-1]
    if highest_high == lowest_low:
        return None
    return ((close - lowest_low) / (highest_high - lowest_low)) * 100


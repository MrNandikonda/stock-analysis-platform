"""
Analyst Report Service
Generates a structured retail-grade analyst report from locally stored StockMetric
and Stock data. All logic is rule-based — no external providers are invented.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Stock, StockMetric


@dataclass
class KeyLevel:
    zone: str
    price: float
    note: str


@dataclass
class AnalystReport:
    ticker: str
    company_name: str
    sector: str | None
    exchange: str
    generated_at: str

    # Price snapshot
    current_price: float
    change_1d: float | None
    change_1y: float | None

    # Technical posture
    sma_50: float | None
    sma_200: float | None
    rsi_14: float | None
    macd: float | None
    macd_signal: float | None
    atr_14: float | None
    technical_posture: str          # "Bullish" | "Bearish" | "Mixed" | "Neutral"
    rsi_label: str                  # "Overbought" | "Oversold" | "Neutral"

    # Key levels
    support_level: float | None
    resistance_level: float | None

    # Fundamentals
    pe: float | None
    pb: float | None
    peg: float | None
    ev_ebitda: float | None
    profit_margin: float | None
    revenue_growth: float | None
    roe: float | None
    debt_equity: float | None
    dividend_yield: float | None
    valuation_label: str            # "Overvalued" | "Fairly Valued" | "Undervalued"

    # Derived signals
    bull_case: list[str]
    bear_case: list[str]
    risk_score: float               # 1–10
    technical_trend: str

    # JSON-friendly summary for frontend widget
    data_freshness: str             # "fresh" | "stale" | "missing"


def _rsi_label(rsi: float | None) -> str:
    if rsi is None:
        return "Unknown"
    if rsi >= 70:
        return "Overbought"
    if rsi <= 30:
        return "Oversold"
    return "Neutral"


def _technical_posture(price: float, sma_50: float | None, sma_200: float | None) -> str:
    above_50 = sma_50 is not None and price > sma_50
    above_200 = sma_200 is not None and price > sma_200
    if above_50 and above_200:
        return "Bullish"
    if not above_50 and not above_200:
        return "Bearish"
    if above_200 and not above_50:
        return "Mixed (Long-term Bullish, Short-term Weak)"
    return "Mixed (Recovery Attempt)"


def _valuation_label(pe: float | None, pb: float | None) -> str:
    if pe is None and pb is None:
        return "Unknown"
    signals = []
    if pe is not None:
        if pe < 0:
            signals.append("loss-making")
        elif pe < 15:
            signals.append("cheap")
        elif pe > 40:
            signals.append("expensive")
        else:
            signals.append("fair")
    if pb is not None:
        if pb > 5:
            signals.append("premium book")
        elif pb < 1:
            signals.append("discount book")

    if "expensive" in signals or "premium book" in signals:
        return "Elevated / Potentially Overvalued"
    if "cheap" in signals or "discount book" in signals:
        return "Potentially Undervalued"
    if "loss-making" in signals:
        return "Pre-Profit / Growth Stage"
    return "Fairly Valued"


def _build_bull_case(m: StockMetric) -> list[str]:
    bullets: list[str] = []
    if m.sma_50 and m.price > m.sma_50 and m.sma_200 and m.price > m.sma_200:
        bullets.append("Trading above both 50-day and 200-day SMAs — confirmed long-term uptrend.")
    if m.revenue_growth and m.revenue_growth > 0.10:
        bullets.append(f"Strong revenue growth of {m.revenue_growth * 100:.1f}% signals healthy business momentum.")
    if m.profit_margin and m.profit_margin > 0.15:
        bullets.append(f"High profit margin of {m.profit_margin * 100:.1f}% demonstrates operational efficiency.")
    if m.roe and m.roe > 0.15:
        bullets.append(f"Return on Equity of {m.roe * 100:.1f}% indicates effective capital deployment.")
    if m.rsi_14 and 40 <= m.rsi_14 <= 65:
        bullets.append("RSI in neutral-to-strong range — momentum is healthy without being stretched.")
    if m.change_1y and m.change_1y > 20:
        bullets.append(f"1-year price appreciation of {m.change_1y:.1f}% reflects sustained investor confidence.")
    if m.dividend_yield and m.dividend_yield > 0.02:
        bullets.append(f"Dividend yield of {m.dividend_yield * 100:.2f}% provides income support for investors.")
    if m.macd and m.macd_signal and m.macd > m.macd_signal:
        bullets.append("MACD above signal line — bullish momentum crossover active.")
    return bullets[:3] or ["Insufficient data to generate bull case from local metrics."]


def _build_bear_case(m: StockMetric) -> list[str]:
    bullets: list[str] = []
    if m.sma_200 and m.price < m.sma_200:
        bullets.append("Price is trading below the 200-day SMA — long-term trend is bearish.")
    if m.rsi_14 and m.rsi_14 >= 70:
        bullets.append(f"RSI at {m.rsi_14:.0f} signals overbought conditions — short-term pullback risk elevated.")
    if m.pe and m.pe > 50:
        bullets.append(f"Elevated P/E of {m.pe:.1f}x leaves little margin for an earnings miss.")
    if m.debt_equity and m.debt_equity > 1.5:
        bullets.append(f"High Debt/Equity ratio of {m.debt_equity:.2f} raises concerns about financial leverage.")
    if m.revenue_growth and m.revenue_growth < 0:
        bullets.append(f"Revenue declined {abs(m.revenue_growth) * 100:.1f}% — top-line contraction is a red flag.")
    if m.profit_margin and m.profit_margin < 0:
        bullets.append("Negative profit margin indicates the company is currently operating at a loss.")
    if m.change_1d and m.change_1d < -3:
        bullets.append(f"Significant 1-day decline of {m.change_1d:.1f}% may signal near-term distribution.")
    if m.macd and m.macd_signal and m.macd < m.macd_signal:
        bullets.append("MACD below signal line — bearish momentum crossover in place.")
    return bullets[:3] or ["Insufficient data to generate bear case from local metrics."]


def _risk_score(m: StockMetric) -> float:
    """Score from 1.0 (lowest risk) to 10.0 (highest risk)."""
    score = 5.0  # Base
    if m.rsi_14:
        if m.rsi_14 >= 75 or m.rsi_14 <= 25:
            score += 1.5
        elif m.rsi_14 >= 70 or m.rsi_14 <= 30:
            score += 0.8
    if m.sma_200 and m.price < m.sma_200:
        score += 1.0
    if m.debt_equity:
        if m.debt_equity > 2.0:
            score += 1.5
        elif m.debt_equity > 1.0:
            score += 0.5
    if m.pe and m.pe > 60:
        score += 1.0
    if m.profit_margin and m.profit_margin < 0:
        score += 1.0
    if m.revenue_growth and m.revenue_growth < 0:
        score += 0.5
    if m.change_1y:
        if m.change_1y < -20:
            score += 0.5
    return round(min(max(score, 1.0), 10.0), 1)


def _support_resistance(m: StockMetric) -> tuple[float | None, float | None]:
    """Estimate nearest support and resistance from 52W high/low proximity and SMAs."""
    price = m.price
    support: float | None = None
    resistance: float | None = None

    candidates_support = []
    candidates_resist = []

    if m.sma_50 and m.sma_50 < price:
        candidates_support.append(m.sma_50)
    if m.sma_200 and m.sma_200 < price:
        candidates_support.append(m.sma_200)
    if m.proximity_52w_low is not None:
        # proximity_52w_low is % from 52W low, so low = price / (1 + proximity_52w_low/100)
        try:
            low_est = price / (1 + (m.proximity_52w_low or 0) / 100)
            if low_est < price:
                candidates_support.append(round(low_est, 2))
        except ZeroDivisionError:
            pass

    if m.sma_50 and m.sma_50 > price:
        candidates_resist.append(m.sma_50)
    if m.sma_200 and m.sma_200 > price:
        candidates_resist.append(m.sma_200)
    if m.proximity_52w_high is not None:
        try:
            high_est = price / (1 - (m.proximity_52w_high or 0) / 100)
            if high_est > price:
                candidates_resist.append(round(high_est, 2))
        except ZeroDivisionError:
            pass

    if candidates_support:
        support = max(candidates_support)  # Nearest floor
    if candidates_resist:
        resistance = min(candidates_resist)  # Nearest ceiling

    return support, resistance


def _data_freshness(updated_at: datetime | None) -> str:
    if updated_at is None:
        return "missing"
    age_hours = (datetime.utcnow() - updated_at).total_seconds() / 3600
    if age_hours < 4:
        return "fresh"
    if age_hours < 24:
        return "recent"
    return "stale"


class AnalystReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def generate(self, symbol: str) -> dict:
        symbol = symbol.upper().strip()

        metric_row = (
            await self.session.execute(select(StockMetric).where(StockMetric.symbol == symbol))
        ).scalar_one_or_none()

        stock_row = (
            await self.session.execute(select(Stock).where(Stock.symbol == symbol))
        ).scalar_one_or_none()

        if metric_row is None:
            return {
                "error": f"No metric data found for {symbol}. Refresh market data first.",
                "ticker": symbol,
            }

        m = metric_row
        posture = _technical_posture(m.price, m.sma_50, m.sma_200)
        support, resistance = _support_resistance(m)
        bull = _build_bull_case(m)
        bear = _build_bear_case(m)
        risk = _risk_score(m)
        valuation = _valuation_label(m.pe, m.pb)
        freshness = _data_freshness(m.updated_at)

        return {
            "ticker": symbol,
            "company_name": stock_row.name if stock_row else symbol,
            "sector": stock_row.sector if stock_row else None,
            "industry": stock_row.industry if stock_row else None,
            "exchange": m.exchange,
            "generated_at": datetime.utcnow().isoformat(),
            "data_freshness": freshness,

            # Price
            "current_price": m.price,
            "change_1d": m.change_1d,
            "change_5d": m.change_5d,
            "change_1m": m.change_1m,
            "change_1y": m.change_1y,

            # Technical
            "sma_50": m.sma_50,
            "sma_200": m.sma_200,
            "rsi_14": m.rsi_14,
            "rsi_label": _rsi_label(m.rsi_14),
            "macd": m.macd,
            "macd_signal": m.macd_signal,
            "atr_14": m.atr_14,
            "technical_posture": posture,
            "technical_trend": posture,
            "support_level": support,
            "resistance_level": resistance,
            "proximity_52w_high": m.proximity_52w_high,
            "proximity_52w_low": m.proximity_52w_low,

            # Fundamentals
            "pe": m.pe,
            "pb": m.pb,
            "peg": m.peg,
            "ev_ebitda": m.ev_ebitda,
            "profit_margin": m.profit_margin,
            "revenue_growth": m.revenue_growth,
            "roe": m.roe,
            "roce": m.roce,
            "debt_equity": m.debt_equity,
            "dividend_yield": m.dividend_yield,
            "eps": m.eps,
            "valuation_label": valuation,

            # Options/volatility
            "pcr": m.pcr,
            "iv": m.iv,
            "oi_change": m.oi_change,

            # Volume
            "volume": m.volume,
            "avg_volume_20d": m.avg_volume_20d,
            "volume_spike": m.volume_spike,

            # Derived
            "bull_case": bull,
            "bear_case": bear,
            "risk_score": risk,
        }

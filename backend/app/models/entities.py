from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    exchange: Mapped[str] = mapped_column(String(12), index=True)
    name: Mapped[str] = mapped_column(String(120))
    sector: Mapped[str | None] = mapped_column(String(80), default=None)
    industry: Mapped[str | None] = mapped_column(String(80), default=None)
    market_cap: Mapped[float | None] = mapped_column(Float, default=None)
    asset_type: Mapped[str] = mapped_column(String(20), default="EQUITY")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PriceHistory(Base):
    __tablename__ = "price_history"
    __table_args__ = (
        Index("ix_price_history_symbol_date", "symbol", "date"),
        UniqueConstraint("symbol", "date", name="uq_price_history_symbol_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(32), ForeignKey("stocks.symbol"), index=True)
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    volume: Mapped[float] = mapped_column(Float, default=0.0)


class Fundamental(Base):
    __tablename__ = "fundamentals"
    __table_args__ = (
        Index("ix_fundamentals_symbol_date", "symbol", "date"),
        UniqueConstraint("symbol", "date", name="uq_fundamentals_symbol_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(32), ForeignKey("stocks.symbol"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    pe: Mapped[float | None] = mapped_column(Float, default=None)
    pb: Mapped[float | None] = mapped_column(Float, default=None)
    peg: Mapped[float | None] = mapped_column(Float, default=None)
    ev_ebitda: Mapped[float | None] = mapped_column(Float, default=None)
    dividend_yield: Mapped[float | None] = mapped_column(Float, default=None)
    roe: Mapped[float | None] = mapped_column(Float, default=None)
    roce: Mapped[float | None] = mapped_column(Float, default=None)
    debt_equity: Mapped[float | None] = mapped_column(Float, default=None)
    profit_margin: Mapped[float | None] = mapped_column(Float, default=None)
    revenue_growth: Mapped[float | None] = mapped_column(Float, default=None)
    eps: Mapped[float | None] = mapped_column(Float, default=None)


class Watchlist(Base):
    __tablename__ = "watchlists"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_watchlists_user_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), default="local")
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["WatchlistItem"]] = relationship(back_populates="watchlist", cascade="all, delete-orphan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (UniqueConstraint("watchlist_id", "symbol", name="uq_watchlist_items_watchlist_symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("watchlists.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(32), ForeignKey("stocks.symbol"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    watchlist: Mapped["Watchlist"] = relationship(back_populates="items")


class PortfolioHolding(Base):
    __tablename__ = "portfolio"
    __table_args__ = (Index("ix_portfolio_user_symbol", "user_id", "symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), default="local")
    symbol: Mapped[str] = mapped_column(String(32), ForeignKey("stocks.symbol"), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    avg_price: Mapped[float] = mapped_column(Float)
    buy_date: Mapped[date] = mapped_column(Date)
    asset_class: Mapped[str] = mapped_column(String(20), default="equity")


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (Index("ix_alerts_user_symbol", "user_id", "symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), default="local")
    symbol: Mapped[str] = mapped_column(String(32), ForeignKey("stocks.symbol"), index=True)
    condition: Mapped[str] = mapped_column(String(30))
    target_value: Mapped[float] = mapped_column(Float)
    triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ScreenerPreset(Base):
    __tablename__ = "screener_presets"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_presets_user_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), default="local")
    name: Mapped[str] = mapped_column(String(120))
    filter_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StockMetric(Base):
    __tablename__ = "stock_metrics"
    __table_args__ = (
        Index("ix_stock_metrics_exchange", "exchange"),
        Index("ix_stock_metrics_price", "price"),
    )

    symbol: Mapped[str] = mapped_column(String(32), ForeignKey("stocks.symbol"), primary_key=True)
    exchange: Mapped[str] = mapped_column(String(12), index=True)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    change_1d: Mapped[float | None] = mapped_column(Float, default=None)
    change_5d: Mapped[float | None] = mapped_column(Float, default=None)
    change_1m: Mapped[float | None] = mapped_column(Float, default=None)
    change_3m: Mapped[float | None] = mapped_column(Float, default=None)
    change_1y: Mapped[float | None] = mapped_column(Float, default=None)
    proximity_52w_high: Mapped[float | None] = mapped_column(Float, default=None)
    proximity_52w_low: Mapped[float | None] = mapped_column(Float, default=None)
    volume: Mapped[float | None] = mapped_column(Float, default=None)
    avg_volume_20d: Mapped[float | None] = mapped_column(Float, default=None)
    volume_spike: Mapped[float | None] = mapped_column(Float, default=None)
    pe: Mapped[float | None] = mapped_column(Float, default=None)
    pb: Mapped[float | None] = mapped_column(Float, default=None)
    peg: Mapped[float | None] = mapped_column(Float, default=None)
    ev_ebitda: Mapped[float | None] = mapped_column(Float, default=None)
    dividend_yield: Mapped[float | None] = mapped_column(Float, default=None)
    roe: Mapped[float | None] = mapped_column(Float, default=None)
    roce: Mapped[float | None] = mapped_column(Float, default=None)
    debt_equity: Mapped[float | None] = mapped_column(Float, default=None)
    profit_margin: Mapped[float | None] = mapped_column(Float, default=None)
    revenue_growth: Mapped[float | None] = mapped_column(Float, default=None)
    rsi_14: Mapped[float | None] = mapped_column(Float, default=None)
    macd: Mapped[float | None] = mapped_column(Float, default=None)
    macd_signal: Mapped[float | None] = mapped_column(Float, default=None)
    sma_50: Mapped[float | None] = mapped_column(Float, default=None)
    sma_200: Mapped[float | None] = mapped_column(Float, default=None)
    oi_change: Mapped[float | None] = mapped_column(Float, default=None)
    pcr: Mapped[float | None] = mapped_column(Float, default=None)
    iv: Mapped[float | None] = mapped_column(Float, default=None)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


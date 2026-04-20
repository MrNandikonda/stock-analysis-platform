CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    exchange TEXT NOT NULL,
    name TEXT NOT NULL,
    sector TEXT,
    industry TEXT,
    market_cap REAL,
    asset_type TEXT NOT NULL DEFAULT 'EQUITY',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_stocks_symbol ON stocks (symbol);
CREATE INDEX IF NOT EXISTS ix_stocks_exchange ON stocks (exchange);

CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL DEFAULT 0,
    FOREIGN KEY(symbol) REFERENCES stocks(symbol) ON DELETE CASCADE,
    UNIQUE(symbol, date)
);
CREATE INDEX IF NOT EXISTS ix_price_history_symbol_date ON price_history (symbol, date);

CREATE TABLE IF NOT EXISTS fundamentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    pe REAL,
    pb REAL,
    peg REAL,
    ev_ebitda REAL,
    dividend_yield REAL,
    roe REAL,
    roce REAL,
    debt_equity REAL,
    profit_margin REAL,
    revenue_growth REAL,
    eps REAL,
    FOREIGN KEY(symbol) REFERENCES stocks(symbol) ON DELETE CASCADE,
    UNIQUE(symbol, date)
);
CREATE INDEX IF NOT EXISTS ix_fundamentals_symbol_date ON fundamentals (symbol, date);

CREATE TABLE IF NOT EXISTS watchlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'local',
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS watchlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
    FOREIGN KEY(symbol) REFERENCES stocks(symbol) ON DELETE CASCADE,
    UNIQUE(watchlist_id, symbol)
);
CREATE INDEX IF NOT EXISTS ix_watchlist_items_watchlist_id ON watchlist_items (watchlist_id);
CREATE INDEX IF NOT EXISTS ix_watchlist_items_symbol ON watchlist_items (symbol);

CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'local',
    symbol TEXT NOT NULL,
    quantity REAL NOT NULL,
    avg_price REAL NOT NULL,
    buy_date TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'equity',
    FOREIGN KEY(symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_portfolio_user_symbol ON portfolio (user_id, symbol);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'local',
    symbol TEXT NOT NULL,
    condition TEXT NOT NULL,
    target_value REAL NOT NULL,
    triggered INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_alerts_user_symbol ON alerts (user_id, symbol);

CREATE TABLE IF NOT EXISTS screener_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'local',
    name TEXT NOT NULL,
    filter_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS stock_metrics (
    symbol TEXT PRIMARY KEY,
    exchange TEXT NOT NULL,
    price REAL DEFAULT 0,
    change_1d REAL,
    change_5d REAL,
    change_1m REAL,
    change_3m REAL,
    change_1y REAL,
    proximity_52w_high REAL,
    proximity_52w_low REAL,
    volume REAL,
    avg_volume_20d REAL,
    volume_spike REAL,
    pe REAL,
    pb REAL,
    peg REAL,
    ev_ebitda REAL,
    dividend_yield REAL,
    roe REAL,
    roce REAL,
    debt_equity REAL,
    profit_margin REAL,
    revenue_growth REAL,
    rsi_14 REAL,
    macd REAL,
    macd_signal REAL,
    sma_50 REAL,
    sma_200 REAL,
    oi_change REAL,
    pcr REAL,
    iv REAL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_stock_metrics_exchange ON stock_metrics (exchange);
CREATE INDEX IF NOT EXISTS ix_stock_metrics_price ON stock_metrics (price);
CREATE INDEX IF NOT EXISTS ix_stock_metrics_updated_at ON stock_metrics (updated_at);

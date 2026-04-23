-- Migration: 0004_portfolio_history

CREATE TABLE IF NOT EXISTS portfolio_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(50) NOT NULL,
    date VARCHAR(10) NOT NULL,
    total_invested REAL NOT NULL,
    total_value REAL NOT NULL,
    unrealized_pnl REAL NOT NULL,
    day_change REAL NOT NULL,
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_date ON portfolio_history(user_id, date);
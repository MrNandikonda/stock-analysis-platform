CREATE TABLE IF NOT EXISTS ai_provider_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_name TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 100,
    api_base_url TEXT,
    model_orchestrator TEXT,
    model_specialist TEXT,
    model_summarizer TEXT,
    extra_config_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ai_provider_config_enabled ON ai_provider_config (enabled);

CREATE TABLE IF NOT EXISTS ai_watchlist_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 0,
    cadence_minutes INTEGER NOT NULL DEFAULT 60,
    categories_json TEXT NOT NULL DEFAULT '[]',
    provider_name TEXT NOT NULL DEFAULT 'openai',
    model_orchestrator_override TEXT,
    model_specialist_override TEXT,
    model_summarizer_override TEXT,
    max_stocks_per_job INTEGER NOT NULL DEFAULT 20,
    max_parallel_agents INTEGER NOT NULL DEFAULT 2,
    stale_after_minutes INTEGER NOT NULL DEFAULT 180,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_ai_watchlist_settings_enabled ON ai_watchlist_settings (enabled);
CREATE INDEX IF NOT EXISTS ix_ai_watchlist_settings_next_run ON ai_watchlist_settings (next_run_at);

CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    triggered_by TEXT NOT NULL DEFAULT 'scheduler',
    scheduled_for TEXT,
    started_at TEXT,
    finished_at TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    total_symbols INTEGER NOT NULL DEFAULT 0,
    processed_symbols INTEGER NOT NULL DEFAULT 0,
    failed_symbols INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    job_metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_ai_analysis_jobs_watchlist_status ON ai_analysis_jobs (watchlist_id, status);
CREATE INDEX IF NOT EXISTS ix_ai_analysis_jobs_created_at ON ai_analysis_jobs (created_at);

CREATE TABLE IF NOT EXISTS ai_agent_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    watchlist_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TEXT,
    finished_at TEXT,
    duration_ms INTEGER,
    confidence_score REAL,
    importance_score REAL,
    raw_score REAL,
    model_name TEXT,
    prompt_version TEXT,
    tokens_input INTEGER,
    tokens_output INTEGER,
    error_message TEXT,
    output_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES ai_analysis_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_ai_agent_runs_job_symbol ON ai_agent_runs (job_id, symbol);
CREATE INDEX IF NOT EXISTS ix_ai_agent_runs_status ON ai_agent_runs (status);
CREATE INDEX IF NOT EXISTS ix_ai_agent_runs_created_at ON ai_agent_runs (created_at);

CREATE TABLE IF NOT EXISTS ai_stock_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    job_id INTEGER,
    overall_signal TEXT NOT NULL,
    overall_score REAL NOT NULL,
    confidence_score REAL NOT NULL,
    executive_summary TEXT NOT NULL,
    thesis_bull TEXT NOT NULL DEFAULT '',
    thesis_bear TEXT NOT NULL DEFAULT '',
    near_term_risks_json TEXT NOT NULL DEFAULT '[]',
    medium_term_risks_json TEXT NOT NULL DEFAULT '[]',
    catalysts_json TEXT NOT NULL DEFAULT '[]',
    regulation_impact TEXT NOT NULL DEFAULT '',
    geo_political_impact TEXT NOT NULL DEFAULT '',
    financial_health_summary TEXT NOT NULL DEFAULT '',
    technical_summary TEXT NOT NULL DEFAULT '',
    event_summary TEXT NOT NULL DEFAULT '',
    options_summary TEXT NOT NULL DEFAULT '',
    source_health_summary TEXT NOT NULL DEFAULT '',
    stale_data_flags_json TEXT NOT NULL DEFAULT '[]',
    citations_json TEXT NOT NULL DEFAULT '[]',
    model_metadata_json TEXT NOT NULL DEFAULT '{}',
    agent_run_metadata_json TEXT NOT NULL DEFAULT '{}',
    is_latest INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
    FOREIGN KEY(job_id) REFERENCES ai_analysis_jobs(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_ai_stock_analysis_watchlist_symbol ON ai_stock_analysis (watchlist_id, symbol);
CREATE INDEX IF NOT EXISTS ix_ai_stock_analysis_is_latest ON ai_stock_analysis (is_latest);
CREATE INDEX IF NOT EXISTS ix_ai_stock_analysis_expires_at ON ai_stock_analysis (expires_at);

CREATE TABLE IF NOT EXISTS ai_stock_analysis_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    category TEXT NOT NULL,
    factor_type TEXT NOT NULL,
    headline_summary TEXT NOT NULL,
    detail TEXT NOT NULL,
    importance_score REAL,
    confidence_score REAL,
    raw_score REAL,
    source_ref TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(analysis_id) REFERENCES ai_stock_analysis(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_ai_stock_analysis_factors_analysis ON ai_stock_analysis_factors (analysis_id);
CREATE INDEX IF NOT EXISTS ix_ai_stock_analysis_factors_symbol_type ON ai_stock_analysis_factors (symbol, factor_type);
CREATE INDEX IF NOT EXISTS ix_ai_stock_analysis_factors_category ON ai_stock_analysis_factors (category);

CREATE TABLE IF NOT EXISTS ai_stock_source_refs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    url TEXT,
    title TEXT,
    snippet TEXT,
    published_at TEXT,
    fetched_at TEXT,
    freshness_minutes INTEGER,
    reliability_score REAL,
    source_metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(analysis_id) REFERENCES ai_stock_analysis(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_ai_stock_source_refs_analysis ON ai_stock_source_refs (analysis_id);
CREATE INDEX IF NOT EXISTS ix_ai_stock_source_refs_symbol_type ON ai_stock_source_refs (symbol, source_type);
CREATE INDEX IF NOT EXISTS ix_ai_stock_source_refs_published_at ON ai_stock_source_refs (published_at);

CREATE TABLE IF NOT EXISTS ai_alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER NOT NULL,
    symbol TEXT,
    rule_name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    condition_json TEXT NOT NULL DEFAULT '{}',
    severity TEXT NOT NULL DEFAULT 'medium',
    cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
    UNIQUE(watchlist_id, symbol, rule_name)
);
CREATE INDEX IF NOT EXISTS ix_ai_alert_rules_enabled ON ai_alert_rules (enabled);
CREATE INDEX IF NOT EXISTS ix_ai_alert_rules_watchlist ON ai_alert_rules (watchlist_id);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER,
    job_id INTEGER,
    analysis_id INTEGER,
    agent_name TEXT,
    log_level TEXT NOT NULL DEFAULT 'info',
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    safe_payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(watchlist_id) REFERENCES watchlists(id) ON DELETE SET NULL,
    FOREIGN KEY(job_id) REFERENCES ai_analysis_jobs(id) ON DELETE SET NULL,
    FOREIGN KEY(analysis_id) REFERENCES ai_stock_analysis(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_ai_audit_logs_job_created ON ai_audit_logs (job_id, created_at);
CREATE INDEX IF NOT EXISTS ix_ai_audit_logs_analysis_created ON ai_audit_logs (analysis_id, created_at);
CREATE INDEX IF NOT EXISTS ix_ai_audit_logs_agent_created ON ai_audit_logs (agent_name, created_at);

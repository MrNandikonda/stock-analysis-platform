export type Market = "ALL" | "NSE" | "US";
export type Currency = "INR" | "USD";
export type LogicOperator = "AND" | "OR";

export interface QuoteItem {
  symbol: string;
  name: string;
  exchange: string;
  asset_type: string;
  sector?: string | null;
  market_cap?: number | null;
  price: number;
  change_1d?: number | null;
  change_5d?: number | null;
  change_1m?: number | null;
  change_3m?: number | null;
  change_1y?: number | null;
  volume?: number | null;
  avg_volume_20d?: number | null;
  volume_spike?: number | null;
  pe?: number | null;
  pb?: number | null;
  peg?: number | null;
  ev_ebitda?: number | null;
  dividend_yield?: number | null;
  roe?: number | null;
  roce?: number | null;
  debt_equity?: number | null;
  profit_margin?: number | null;
  revenue_growth?: number | null;
  rsi_14?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  atr_14?: number | null;
  pcr?: number | null;
  iv?: number | null;
  oi_change?: number | null;
  updated_at: string;
}

export interface QuotesResponse {
  items: QuoteItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface MarketStatusResponse {
  timestamp_utc: string;
  nse: {
    is_open: boolean;
    local_time: string;
    session: string;
    timezone: string;
  };
  nyse: {
    is_open: boolean;
    local_time: string;
    session: string;
    pre_market: string;
    post_market: string;
    timezone: string;
  };
}

export interface ScreenerFilter {
  field: string;
  operator: string;
  value: string | number | (number | string)[];
}

export interface ScreenerQueryPayload {
  market: Market;
  logic: LogicOperator;
  filters: ScreenerFilter[];
  sort_by: string;
  sort_order: "asc" | "desc";
  page: number;
  page_size: number;
}

export interface WatchlistItem {
  symbol: string;
  price: number | null;
  change_1d: number | null;
  updated_at: string | null;
}

export interface Watchlist {
  id: number;
  name: string;
  items: WatchlistItem[];
  created_at: string;
}

export interface PriceHistoryItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PresetItem {
  id: number;
  name: string;
  query: ScreenerQueryPayload;
  created_at: string;
}

export interface PortfolioHolding {
  id: number;
  symbol: string;
  quantity: number;
  avg_price: number;
  buy_date: string;
  asset_class: string;
  current_price: number;
  market_value: number;
  invested_value: number;
  unrealized_pnl: number;
  day_change: number;
  xirr: number;
}

export interface PortfolioSummary {
  timestamp_utc: string;
  total_invested: number;
  total_value: number;
  unrealized_pnl: number;
  day_change: number;
  xirr: number;
  sector_allocation: Record<string, number>;
  asset_class_split: Record<string, number>;
  holdings_count: number;
}

export interface NewsItem {
  title: string;
  summary: string;
  link: string;
  published: string;
  source: string;
  sentiment: number;
}

export interface EarningsEvent {
  symbol: string;
  earnings_date_utc: string;
  market: string;
}

export interface OptionRow {
  strike: number;
  ce_oi: number;
  pe_oi: number;
  ce_iv: number;
  pe_iv: number;
  ce_volume: number;
  pe_volume: number;
  ce_ltp?: number | null;
  pe_ltp?: number | null;
}

export interface OptionsChain {
  symbol: string;
  timestamp: string;
  spot: number;
  rows: OptionRow[];
  pcr?: number | null;
  iv?: number | null;
  max_pain?: number | null;
}

export type AIAnalysisCategory =
  | "news_intel"
  | "geopolitical_risk"
  | "regulation"
  | "fundamentals"
  | "technicals"
  | "earnings_events"
  | "options_flow"
  | "macro_sector"
  | "portfolio_impact"
  | "source_health"
  | "webapp_ops";

export type AIOverallSignal = "strong_bearish" | "bearish" | "neutral" | "bullish" | "strong_bullish" | "no_data";
export type AIFactorType = "bullish" | "bearish" | "neutral" | "risk" | "catalyst" | "stale";

export interface AIProviderStatus {
  provider_name: string;
  enabled: boolean;
  ready: boolean;
  status: string;
  message: string;
  model_orchestrator?: string | null;
  model_specialist?: string | null;
  model_summarizer?: string | null;
  supports_tool_calling: boolean;
  supports_background_mode: boolean;
}

export interface AIStatusResponse {
  ai_analysis_enabled: boolean;
  default_provider: string;
  background_mode_enabled: boolean;
  web_search_enabled: boolean;
  available_categories: AIAnalysisCategory[];
  providers: AIProviderStatus[];
}

export interface AIWatchlistSettings {
  enabled: boolean;
  cadence_minutes: number;
  categories: AIAnalysisCategory[];
  provider_name: string;
  model_orchestrator_override?: string | null;
  model_specialist_override?: string | null;
  model_summarizer_override?: string | null;
  max_stocks_per_job: number;
  max_parallel_agents: number;
  stale_after_minutes: number;
}

export interface AIRunJobResponse {
  job_id: number;
  status: string;
  processed_symbols?: number;
  failed_symbols?: number;
}

export interface AISourceRef {
  source_type: string;
  source_name: string;
  url?: string | null;
  title?: string | null;
  snippet?: string | null;
  published_at?: string | null;
  fetched_at?: string | null;
  freshness_minutes?: number | null;
  reliability_score?: number | null;
  source_metadata?: Record<string, unknown>;
}

export interface AIAnalysisFactor {
  category: string;
  factor_type: AIFactorType;
  headline_summary: string;
  detail: string;
  importance_score: number;
  confidence_score: number;
  raw_score: number;
  source_ref?: string | null;
}

export interface AIAnalysisListItem {
  symbol: string;
  overall_signal: Exclude<AIOverallSignal, "no_data">;
  overall_score: number;
  confidence_score: number;
  executive_summary: string;
  stale_data_flags: string[];
  created_at: string;
  expires_at?: string | null;
}

export interface AIAggregatedAnalysis {
  symbol: string;
  watchlist_id: number;
  overall_signal: Exclude<AIOverallSignal, "no_data">;
  overall_score: number;
  confidence_score: number;
  executive_summary: string;
  thesis_bull: string;
  thesis_bear: string;
  near_term_risks: string[];
  medium_term_risks: string[];
  catalysts: string[];
  regulation_impact: string;
  geo_political_impact: string;
  financial_health_summary: string;
  technical_summary: string;
  event_summary: string;
  options_summary: string;
  source_health_summary: string;
  stale_data_flags: string[];
  citations: AISourceRef[];
  model_metadata: Record<string, unknown>;
  agent_run_metadata: Record<string, unknown>;
  factors: AIAnalysisFactor[];
  source_refs: AISourceRef[];
}

export interface AIAnalysisDelta {
  previous_signal?: Exclude<AIOverallSignal, "no_data"> | null;
  score_change?: number | null;
  confidence_change?: number | null;
  changed: boolean;
  why_changed: string[];
}

export interface AIStockAnalysisDetail {
  symbol: string;
  watchlist_id: number;
  analysis: AIAggregatedAnalysis;
  previous_delta: AIAnalysisDelta;
  created_at: string;
  expires_at?: string | null;
}

export interface AIWatchlistSummary {
  watchlist_id: number;
  watchlist_name: string;
  enabled: boolean;
  provider_name: string;
  overall_sentiment: AIOverallSignal;
  average_score?: number | null;
  average_confidence?: number | null;
  last_run_time?: string | null;
  next_run_time?: string | null;
  top_bullish_names: string[];
  top_bearish_names: string[];
  stale_data_warning: boolean;
  stale_symbols: string[];
  latest_analyses: AIAnalysisListItem[];
}

export interface AIJobSummary {
  id: number;
  watchlist_id: number;
  status: string;
  triggered_by: string;
  total_symbols: number;
  processed_symbols: number;
  failed_symbols: number;
  retry_count: number;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface PortfolioHistoryPoint {
  date: string;
  total_value: number;
  total_invested: number;
  unrealized_pnl: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  asset_type: string;
}

export interface AIDiagnosticsResponse {
  providers: AIProviderStatus[];
  recent_jobs: AIJobSummary[];
  recent_failures: AIJobSummary[];
  average_run_duration_ms?: number | null;
  token_summary: Record<string, number>;
  source_health: Record<string, number>;
  safety_mode: Record<string, boolean>;
  admin_summary: string;
}

export interface AnalystReport {
  ticker: string;
  company_name: string;
  sector?: string | null;
  industry?: string | null;
  exchange: string;
  generated_at: string;
  data_freshness: "fresh" | "recent" | "stale" | "missing";
  error?: string;

  // Price
  current_price: number;
  change_1d?: number | null;
  change_5d?: number | null;
  change_1m?: number | null;
  change_1y?: number | null;

  // Technical
  sma_50?: number | null;
  sma_200?: number | null;
  rsi_14?: number | null;
  rsi_label: string;
  macd?: number | null;
  macd_signal?: number | null;
  atr_14?: number | null;
  technical_posture: string;
  technical_trend: string;
  support_level?: number | null;
  resistance_level?: number | null;
  proximity_52w_high?: number | null;
  proximity_52w_low?: number | null;

  // Fundamentals
  pe?: number | null;
  pb?: number | null;
  peg?: number | null;
  ev_ebitda?: number | null;
  profit_margin?: number | null;
  revenue_growth?: number | null;
  roe?: number | null;
  roce?: number | null;
  debt_equity?: number | null;
  dividend_yield?: number | null;
  eps?: number | null;
  valuation_label: string;

  // Options / volume
  pcr?: number | null;
  iv?: number | null;
  oi_change?: number | null;
  volume?: number | null;
  avg_volume_20d?: number | null;
  volume_spike?: number | null;

  // Derived
  bull_case: string[];
  bear_case: string[];
  risk_score: number;
}

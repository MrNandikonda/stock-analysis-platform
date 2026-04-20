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

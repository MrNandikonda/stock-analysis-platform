// ─── Mock data types ───────────────────────────────────────────────────────
export type Signal = "bull" | "bear" | "warn" | "neutral" | "info";
export type Consensus = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";

export interface WatchlistTicker {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change1d: number;
  signal: Signal;
}

export interface CIOSummary {
  narrative: string;
  bullCase: string[];
  bearCase: string[];
  consensus: Consensus;
  consensusRationale: string;
  analystCount: number;
  buyCount: number;
  holdCount: number;
  sellCount: number;
  priceTarget: string;
}

export interface FundamentalsReport {
  revenue_growth_yoy: number | null;
  is_profitable: boolean;
  eps_ttm: number | null;
  pe_trailing: number | null;
  pe_forward: number | null;
  price_to_sales: number | null;
  price_to_book: number | null;
  ev_ebitda: number | null;
  profit_margin: number | null;
  roe: number | null;
  debt_equity: number | null;
  cash_bn: number | null;
  debt_bn: number | null;
  valuation_verdict: string;
  health_verdict: string;
}

export interface QuantReport {
  price: number;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  rsi_label: "Overbought" | "Neutral" | "Oversold";
  macd: number | null;
  macd_signal: number | null;
  support: number | null;
  resistance: number | null;
  short_interest_pct: number | null;
  days_to_cover: number | null;
  atr14: number | null;
  technical_posture: string;
}

export interface MacroReport {
  rate_sensitivity: "High Positive" | "Moderate Positive" | "Neutral" | "Moderate Negative" | "High Negative";
  rate_narrative: string;
  regulatory_risks: string[];
  geopolitical_risks: string[];
  macro_tailwinds: string[];
  macro_headwinds: string[];
  horizon: "6–12 months";
}

export interface MasterSynthesis {
  risk_score: number;
  risk_rationale: string;
  technical_trend: string;
  one_line_verdict: string;
  generated_at: string;
  payload: {
    ticker: string;
    current_price_estimate: string;
    bull_summary: string[];
    bear_summary: string[];
    risk_score: number;
    technical_trend: string;
    consensus: Consensus;
  };
}

export interface AnalystReport {
  ticker: string;
  company_name: string;
  exchange: string;
  sector: string;
  cio: CIOSummary;
  fundamentals: FundamentalsReport;
  quant: QuantReport;
  macro: MacroReport;
  master: MasterSynthesis;
}

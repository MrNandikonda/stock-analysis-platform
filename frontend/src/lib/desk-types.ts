// Desk signal types — used only within the Retail Intelligence Desk page
export type DeskSignal = "bull" | "bear" | "warn" | "neutral" | "info";
export type DeskSeverity = "high" | "medium" | "low" | "positive";
export type Consensus = "Constructive" | "Neutral" | "Cautious";

export interface DeskCIOSummary {
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

export interface DeskFundamentals {
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
  roce: number | null;
  debt_equity: number | null;
  dividend_yield: number | null;
  cash_bn: number | null;
  debt_bn: number | null;
  valuation_verdict: string;
  health_verdict: string;
}

export interface DeskQuant {
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
  proximity_52w_high: number | null;
  proximity_52w_low: number | null;
  pcr: number | null;
  iv: number | null;
  oi_change: number | null;
  volume: number | null;
  avg_volume_20d: number | null;
  volume_spike: number | null;
  technical_posture: string;
}

export interface DeskMacro {
  rate_sensitivity: string;
  rate_narrative: string;
  regulatory_risks: string[];
  geopolitical_risks: string[];
  macro_tailwinds: string[];
  macro_headwinds: string[];
  horizon: string;
}

export interface DeskMasterSynthesis {
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

export interface DeskAnalystReport {
  ticker: string;
  company_name: string;
  exchange: string;
  sector: string | null;
  cio: DeskCIOSummary;
  fundamentals: DeskFundamentals;
  quant: DeskQuant;
  macro: DeskMacro;
  master: DeskMasterSynthesis;
}

import type { AnalystReport, WatchlistTicker } from "./types";

// ─── Watchlist ───────────────────────────────────────────────────────────────
export const MOCK_WATCHLIST: WatchlistTicker[] = [
  { symbol: "NVDA",  name: "NVIDIA Corporation",     sector: "Semiconductors",    price: 208.42, change1d:  2.14, signal: "bull" },
  { symbol: "HOOD",  name: "Robinhood Markets",      sector: "Fintech",           price:  85.50, change1d: -1.22, signal: "warn" },
  { symbol: "AAPL",  name: "Apple Inc.",              sector: "Technology",        price: 196.30, change1d:  0.43, signal: "bull" },
  { symbol: "META",  name: "Meta Platforms",          sector: "Social Media",      price: 521.70, change1d:  1.87, signal: "bull" },
  { symbol: "TSLA",  name: "Tesla Inc.",              sector: "Automotive / EV",   price: 248.80, change1d: -3.41, signal: "bear" },
  { symbol: "JPM",   name: "JPMorgan Chase",          sector: "Banking",           price: 222.15, change1d:  0.31, signal: "neutral" },
  { symbol: "SOFI",  name: "SoFi Technologies",       sector: "Fintech",           price:  14.82, change1d: -0.98, signal: "warn" },
  { symbol: "PLTR",  name: "Palantir Technologies",   sector: "AI / Data",         price: 102.44, change1d:  4.22, signal: "bull" },
];

// ─── Report store ─────────────────────────────────────────────────────────────
export const MOCK_REPORTS: Record<string, AnalystReport> = {
  NVDA: {
    ticker: "NVDA", company_name: "NVIDIA Corporation",
    exchange: "NASDAQ", sector: "Semiconductors",
    cio: {
      narrative: "NVIDIA is the foundational infrastructure layer of the global AI economy. Its H100/H200/Blackwell GPU architecture is the substrate on which the entire AI supercycle runs. Having crossed $5 trillion in market cap, the narrative now pivots from 'who wins AI?' to 'how long does the CapEx cycle last?'",
      bullCase: [
        "Unbreakable CUDA software moat — 15+ years of developer lock-in that competitors cannot replicate in a single product cycle.",
        "Hyperscaler CapEx arms race: Microsoft, Meta, Google, and Amazon collectively spending $200B+ annually on AI infra, NVDA is the primary beneficiary.",
        "Forward P/E compressed to ~24x despite 69% YoY revenue growth — multiple is more reasonable than the headline stock price implies.",
      ],
      bearCase: [
        "Big Tech custom ASICs (Google TPU, Amazon Trainium) could erode inference market share as the workload mix shifts from training to serving.",
        "U.S.–China export control escalation (Chip Security Act + MATCH Act) risks permanent revenue loss in the world's second-largest economy.",
        "P/S of 23x leaves zero margin for error — any demand air-pocket in hyperscaler CapEx would trigger a violent multiple compression.",
      ],
      consensus: "Strong Buy", consensusRationale: "35 of 38 covering analysts rated Buy or Strong Buy, anchored on Blackwell ramp, inference growth, and sovereign AI demand.",
      analystCount: 38, buyCount: 35, holdCount: 2, sellCount: 1,
      priceTarget: "$265–$280",
    },
    fundamentals: {
      revenue_growth_yoy: 69.0, is_profitable: true, eps_ttm: 2.94,
      pe_trailing: 41.5, pe_forward: 24.5, price_to_sales: 22.7, price_to_book: 52.0, ev_ebitda: 35.2,
      profit_margin: 0.557, roe: 1.23, debt_equity: 0.42,
      cash_bn: 7.8, debt_bn: 8.5,
      valuation_verdict: "Elevated — justified by growth trajectory but priced for perfection.",
      health_verdict: "Fort Knox — exceptional FCF generation, manageable debt load.",
    },
    quant: {
      price: 208.42, sma50: 184.20, sma200: 182.50,
      rsi14: 72.4, rsi_label: "Overbought",
      macd: 3.82, macd_signal: 2.91,
      support: 197.00, resistance: 212.00,
      short_interest_pct: 1.8, days_to_cover: 1.1, atr14: 7.44,
      technical_posture: "Bullish — Above 50-SMA & 200-SMA. Golden cross confirmed.",
    },
    macro: {
      rate_sensitivity: "Moderate Negative",
      rate_narrative: "NVDA is rate-sensitive indirectly via the discount rate applied to its long-dated growth cash flows. Fed hikes compress the premium P/S multiple — the mechanism behind its 65% drawdown in 2022. A dovish pivot in H2 2026 would be a direct multiple re-rating catalyst.",
      regulatory_risks: ["U.S.–China export controls (Chip Security Act, MATCH Act) threaten China revenue.", "Proposed chip tracking mandates could disrupt global supply chain economics."],
      geopolitical_risks: ["China accelerating domestic GPU alternatives (Huawei Ascend) as a long-term competitive risk.", "Bipartisan congressional pressure to tighten semiconductor export restrictions further."],
      macro_tailwinds: ["Sovereign AI programs worldwide creating geopolitically insulated demand.", "Inference workload explosion — agentic AI requires 10–100x more continuous compute than training."],
      macro_headwinds: ["Hyperscaler AI ROI uncertainty could trigger a CapEx retrenchment cycle.", "Macro slowdown compressing enterprise IT budgets for non-hyperscaler customers."],
      horizon: "6–12 months",
    },
    master: {
      risk_score: 6.0,
      risk_rationale: "Exceptional business quality but P/S of 23x, overbought RSI of 72, and active China export control risk introduce meaningful downside for new entries at current levels.",
      technical_trend: "Bullish — Golden Cross, RSI overbought, coiling near $210 resistance.",
      one_line_verdict: "World-class business at a demanding valuation — ideal on pullbacks to the $197–$202 support zone.",
      generated_at: new Date().toISOString(),
      payload: {
        ticker: "NVDA", current_price_estimate: "$208.42",
        bull_summary: ["CUDA moat and hyperscaler CapEx dominance.", "69% YoY revenue growth with FCF acceleration.", "Sovereign AI as a new geopolitically insulated demand channel."],
        bear_summary: ["P/S of 23x priced for perfection.", "China export controls are an active revenue risk.", "Custom ASIC competition threatening inference market share."],
        risk_score: 6.0, technical_trend: "Bullish — Golden Cross active, RSI overbought", consensus: "Strong Buy",
      },
    },
  },

  HOOD: {
    ticker: "HOOD", company_name: "Robinhood Markets",
    exchange: "NASDAQ", sector: "Fintech",
    cio: {
      narrative: "Robinhood stands at a critical inflection point — transitioning from a retail trading app to a full-stack financial 'Super App.' With Q1 2026 earnings due April 28, investors are watching whether Gold subscriptions, credit cards, and prediction markets can structurally decouple revenue from crypto volatility.",
      bullCase: [
        "'Super App' ecosystem maturity — high-margin Gold subscriptions and credit products create a structural earnings floor independent of trading volume.",
        "PDT rule elimination and crypto regulatory tailwinds are structural catalysts for sustained platform engagement.",
        "$1.5B share repurchase program signals management confidence; strong balance sheet supports capital return.",
      ],
      bearCase: [
        "Recurring 'sell-the-news' pattern — stock has declined after earnings beats in multiple prior quarters due to rich forward expectations.",
        "Heavy reliance on cryptocurrency transaction revenue; a crypto winter would materially compress top line.",
        "PFOF remains a 'sword of Damocles' — any SEC action would hit the core business model.",
      ],
      consensus: "Buy", consensusRationale: "Moderate Buy consensus with ~$111–120 average 12-month target. Bulls point to Super App evolution; bears flag sell-the-news risk.",
      analystCount: 27, buyCount: 18, holdCount: 7, sellCount: 2,
      priceTarget: "$111–$120",
    },
    fundamentals: {
      revenue_growth_yoy: 27.0, is_profitable: true, eps_ttm: 0.66,
      pe_trailing: 41.0, pe_forward: 32.0, price_to_sales: 8.4, price_to_book: 4.2, ev_ebitda: 28.0,
      profit_margin: 0.12, roe: 0.14, debt_equity: 0.61,
      cash_bn: 4.3, debt_bn: 3.1,
      valuation_verdict: "Premium — P/E of 41x requires sustained earnings beats to justify.",
      health_verdict: "Solid — cash covers short-term liabilities; NII provides a recurring income floor.",
    },
    quant: {
      price: 85.50, sma50: 75.80, sma200: 107.20,
      rsi14: 52.0, rsi_label: "Neutral",
      macd: 1.24, macd_signal: 0.98,
      support: 78.00, resistance: 94.00,
      short_interest_pct: 4.5, days_to_cover: 1.4, atr14: 3.20,
      technical_posture: "Mixed — Above 50-SMA (bullish ST), Below 200-SMA (bearish LT). Consolidation base.",
    },
    macro: {
      rate_sensitivity: "High Negative",
      rate_narrative: "HOOD is acutely rate-sensitive in two opposing directions: higher rates compress NII margin from customer cash sweeps (headwind) but also suppress retail risk appetite (headwind on trading volumes). Rate cuts provide a simultaneous NII boost AND drive retail investors back into risk-on crypto/equity trading (double tailwind).",
      regulatory_risks: ["PFOF ban risk — SEC monitoring remains a chronic overhang.", "Prediction markets facing state-level legal challenges (Wisconsin DOJ lawsuit)."],
      geopolitical_risks: ["Crypto market contagion from offshore exchange collapses could suppress trading volumes.", "International expansion (UK, Singapore) faces fragmented regulatory approval timelines."],
      macro_tailwinds: ["Fed rate cut cycle in H2 2026 would boost both NII and retail trading engagement simultaneously.", "Gen-Z wealth accumulation wave entering peak savings/investing years."],
      macro_headwinds: ["Elevated consumer debt levels constraining discretionary investment capacity.", "Competition from established brokers (Schwab, Fidelity) adding commission-free features."],
      horizon: "6–12 months",
    },
    master: {
      risk_score: 7.5,
      risk_rationale: "Strong balance sheet and growing Super App, but rich 41x P/E, crypto revenue dependency, ongoing PFOF overhang, and sell-the-news pattern represent meaningful compounded risk.",
      technical_trend: "Mixed — Bottoming base formation, below 200-SMA, RSI neutral.",
      one_line_verdict: "High-quality fintech disruptor trading at a demanding multiple — wait for post-earnings clarity before establishing new positions.",
      generated_at: new Date().toISOString(),
      payload: {
        ticker: "HOOD", current_price_estimate: "$85.50",
        bull_summary: ["Super App subscription revenue creating durable earnings floor.", "PDT elimination + crypto tailwinds = structural engagement catalyst.", "$1.5B buyback signals management conviction."],
        bear_summary: ["Sell-the-news pattern has punished bulls after multiple earnings beats.", "Crypto revenue dependency creates violent top-line sensitivity.", "PFOF regulatory risk is a chronic unresolvable overhang."],
        risk_score: 7.5, technical_trend: "Mixed — Below 200-SMA, Bottoming Base", consensus: "Buy",
      },
    },
  },

  TSLA: {
    ticker: "TSLA", company_name: "Tesla Inc.",
    exchange: "NASDAQ", sector: "Automotive / EV",
    cio: {
      narrative: "Tesla is no longer just an EV company — it is a contested story between 'AI/Robotics platform' bulls and 'deteriorating auto business' bears. Brand damage from Elon Musk's political profile, rising Chinese EV competition from BYD, and margin compression from aggressive price cuts have created a deeply divided analyst community.",
      bullCase: [
        "Optimus humanoid robot represents a trillion-dollar optionality that traditional auto valuation models completely ignore.",
        "Full Self-Driving (FSD) software licensing could become a high-margin recurring revenue stream as the fleet scales.",
        "Energy storage (Megapack) is a rapidly growing, high-margin business with multi-year backlog supporting visibility.",
      ],
      bearCase: [
        "Brand damage from Elon Musk's political activities is measurably suppressing demand in core European and U.S. progressive markets.",
        "BYD and Chinese EV manufacturers are achieving cost parity and outpacing Tesla on features in the world's largest EV market.",
        "Automotive gross margins have deteriorated from ~26% to ~13% through aggressive price cuts — core business profitability is under structural pressure.",
      ],
      consensus: "Hold", consensusRationale: "Deeply split analyst community. Bears cite brand damage and margin deterioration; bulls price in Optimus/FSD optionality that is impossible to value with traditional DCF models.",
      analystCount: 44, buyCount: 14, holdCount: 18, sellCount: 12,
      priceTarget: "$215–$350",
    },
    fundamentals: {
      revenue_growth_yoy: -3.5, is_profitable: true, eps_ttm: 2.04,
      pe_trailing: 122.0, pe_forward: 88.0, price_to_sales: 8.2, price_to_book: 14.8, ev_ebitda: 68.0,
      profit_margin: 0.077, roe: 0.11, debt_equity: 0.08,
      cash_bn: 29.1, debt_bn: 5.6,
      valuation_verdict: "Speculative — 122x trailing P/E implies the market is pricing Optimus/FSD, not the auto business.",
      health_verdict: "Strong balance sheet — $29B cash with minimal debt. Can absorb a prolonged EV downturn.",
    },
    quant: {
      price: 248.80, sma50: 268.40, sma200: 298.10,
      rsi14: 38.2, rsi_label: "Oversold",
      macd: -4.12, macd_signal: -2.88,
      support: 235.00, resistance: 275.00,
      short_interest_pct: 8.9, days_to_cover: 2.1, atr14: 14.80,
      technical_posture: "Bearish — Below 50-SMA & 200-SMA. Death cross formation. RSI approaching oversold.",
    },
    macro: {
      rate_sensitivity: "Moderate Negative",
      rate_narrative: "As a capital-intensive growth stock, TSLA benefits from lower rates (reduced financing costs for both capex and consumer auto loans). However, the dominant drivers are EV demand cycles and competitive dynamics, not rate sensitivity alone.",
      regulatory_risks: ["Autonomous driving regulatory approvals (Robotaxi) remain uncertain across U.S. and EU jurisdictions.", "EV subsidy changes (IRA modifications) could impact demand for entry-level models."],
      geopolitical_risks: ["U.S.–China trade tensions creating risk around Shanghai Gigafactory supply chain and export volumes.", "European market regulatory scrutiny of FSD capabilities."],
      macro_tailwinds: ["EV infrastructure buildout (charging networks) improving range anxiety and adoption rates.", "Rate cuts would reduce auto financing costs, stimulating EV demand."],
      macro_headwinds: ["Elevated consumer debt suppressing willingness to finance big-ticket purchases.", "Global automotive market oversupply creating pricing pressure industry-wide."],
      horizon: "6–12 months",
    },
    master: {
      risk_score: 8.5,
      risk_rationale: "The combination of negative revenue growth, 122x P/E, deteriorating margins, brand damage, intense Chinese competition, and a bearish death cross technical setup creates the highest risk profile in the watchlist.",
      technical_trend: "Bearish — Death Cross, Below Both SMAs, MACD Negative.",
      one_line_verdict: "Only for high-conviction Optimus/FSD believers — fundamental auto business is in deterioration; technicals are broken.",
      generated_at: new Date().toISOString(),
      payload: {
        ticker: "TSLA", current_price_estimate: "$248.80",
        bull_summary: ["Optimus robot = trillion-dollar optionality on humanoid robotics.", "FSD licensing as a high-margin software revenue stream.", "Megapack energy storage growing rapidly with high visibility backlog."],
        bear_summary: ["Revenue declined 3.5% YoY — core auto business is contracting.", "Trailing P/E of 122x is speculative, not investment-grade.", "Brand damage measurably suppressing demand in key markets."],
        risk_score: 8.5, technical_trend: "Bearish — Death Cross formation", consensus: "Hold",
      },
    },
  },
};

// ─── API functions (swap USE_MOCK=false for real REST) ────────────────────────
export const USE_MOCK = true;
const POLL_MS = 5 * 60 * 1000; // 5-minute auto-poll

export const api = {
  getWatchlist: async (): Promise<typeof MOCK_WATCHLIST> => {
    if (USE_MOCK) { await delay(180); return MOCK_WATCHLIST; }
    const r = await fetch("/api/v1/watchlists"); return r.json();
  },
  getReport: async (symbol: string): Promise<AnalystReport | null> => {
    if (USE_MOCK) {
      await delay(420);
      return MOCK_REPORTS[symbol] ?? null;
    }
    const r = await fetch(`/api/v1/market/report/${symbol}`); return r.json();
  },
  POLL_MS,
};

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

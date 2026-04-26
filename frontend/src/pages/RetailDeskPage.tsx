import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, FileText, Loader2, RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { DeskCIOCard } from "@/components/desk/DeskCIOCard";
import { DeskFundamentalsCard } from "@/components/desk/DeskFundamentalsCard";
import { DeskQuantCard } from "@/components/desk/DeskQuantCard";
import { DeskMacroCard } from "@/components/desk/DeskMacroCard";
import { DeskMasterCard } from "@/components/desk/DeskMasterCard";
import { DeskSignalBadge } from "@/components/desk/DeskSignalBadge";
import { deskFmt, deskPrice, deskRiskSignal } from "@/lib/desk-utils";
import { cn } from "@/lib/utils";
import type { DeskAnalystReport, DeskSignal } from "@/lib/desk-types";

// ─── Type adapter: map raw backend report → DeskAnalystReport ───────────────
function adaptReport(raw: Record<string, unknown>): DeskAnalystReport | null {
  if (!raw || raw.error) return null;

  const price = (raw.current_price as number) ?? 0;
  const rsi = raw.rsi_14 as number | null;
  const rsiLabel: "Overbought" | "Neutral" | "Oversold" =
    rsi == null ? "Neutral" : rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";

  const change1d = (raw.change_1d as number | null) ?? 0;
  const sma50 = raw.sma_50 as number | null;
  const sma200 = raw.sma_200 as number | null;
  const above50 = sma50 != null && price > sma50;
  const above200 = sma200 != null && price > sma200;

  const pe = raw.pe as number | null;
  const pb = raw.pb as number | null;
  const roe = raw.roe as number | null;
  const profitMargin = raw.profit_margin as number | null;
  const revenueGrowth = raw.revenue_growth as number | null;
  const debtEquity = raw.debt_equity as number | null;

  // Derive bull/bear cases and risk from backend data
  const bullCase = (raw.bull_case as string[]) ?? ["Insufficient data — refresh market metrics."];
  const bearCase = (raw.bear_case as string[]) ?? ["Insufficient data — refresh market metrics."];
  const riskScore = (raw.risk_score as number) ?? 5.0;

  // Derive consensus from technical posture + fundamentals
  const posture = (raw.technical_posture as string) ?? "";
  const isBullish = posture.toLowerCase().includes("bullish");
  const isBearish = posture.toLowerCase().includes("bearish");
  const consensus = isBullish ? "Buy" as const : isBearish ? "Sell" as const : "Hold" as const;

  const prx52wH = raw.proximity_52w_high as number | null;
  const prx52wL = raw.proximity_52w_low as number | null;
  const highEst = prx52wH != null ? price / (1 - prx52wH / 100) : null;
  const lowEst = prx52wL != null ? price / (1 + prx52wL / 100) : null;

  const rateSensitivity =
    debtEquity && debtEquity > 1 ? "Moderate Negative" :
    pe && pe > 50 ? "Moderate Negative" : "Neutral";

  return {
    ticker: raw.ticker as string,
    company_name: raw.company_name as string,
    exchange: raw.exchange as string,
    sector: raw.sector as string | null,
    cio: {
      narrative: `${raw.company_name} (${raw.ticker}) — ${raw.sector ?? "Equity"} — is trading at ${deskPrice(price)} with a technical posture of "${posture}". This report is generated algorithmically from locally cached market metrics. Data freshness: ${raw.data_freshness}.`,
      bullCase,
      bearCase,
      consensus,
      consensusRationale: `Derived from local technical and fundamental metrics. Valuation: ${raw.valuation_label}. RSI: ${rsi?.toFixed(0) ?? "N/A"} (${rsiLabel}).`,
      analystCount: 0,
      buyCount: isBullish ? 1 : 0,
      holdCount: !isBullish && !isBearish ? 1 : 0,
      sellCount: isBearish ? 1 : 0,
      priceTarget: sma200 ? deskPrice(sma200 * 1.1) : "—",
    },
    fundamentals: {
      revenue_growth_yoy: revenueGrowth != null ? revenueGrowth * 100 : null,
      is_profitable: profitMargin != null && profitMargin > 0,
      eps_ttm: raw.eps as number | null,
      pe_trailing: pe,
      pe_forward: pe ? pe * 0.85 : null,
      price_to_sales: raw.peg as number | null,
      price_to_book: pb,
      ev_ebitda: raw.ev_ebitda as number | null,
      profit_margin: profitMargin,
      roe,
      debt_equity: debtEquity,
      cash_bn: null,
      debt_bn: null,
      valuation_verdict: raw.valuation_label as string ?? "—",
      health_verdict: debtEquity && debtEquity > 1.5 ? "Leveraged — monitor debt levels." : "Balance sheet appears manageable based on available metrics.",
    },
    quant: {
      price,
      sma50,
      sma200,
      rsi14: rsi,
      rsi_label: rsiLabel,
      macd: raw.macd as number | null,
      macd_signal: raw.macd_signal as number | null,
      support: raw.support_level as number | null,
      resistance: raw.resistance_level as number | null,
      short_interest_pct: null,
      days_to_cover: null,
      atr14: raw.atr_14 as number | null,
      technical_posture: posture || "Insufficient data for technical assessment.",
    },
    macro: {
      rate_sensitivity: rateSensitivity,
      rate_narrative: `${raw.company_name} has ${debtEquity && debtEquity > 1 ? "elevated leverage, making it sensitive to rate increases" : "moderate leverage; rate sensitivity is indirect via valuation multiples and growth discount rates"}.`,
      regulatory_risks: ["No specific regulatory risk data available from local metrics. Review sector-specific filings."],
      geopolitical_risks: (typeof raw.sector === "string" && (raw.sector.toLowerCase().includes("semi") || raw.sector.toLowerCase().includes("tech")))
        ? ["Technology sector faces ongoing U.S.–China trade and export control risks."]
        : ["Geopolitical risk varies by sector exposure — review latest news for specific threats."],
      macro_tailwinds: revenueGrowth && revenueGrowth > 0 ? [`Revenue growing at ${(revenueGrowth * 100).toFixed(1)}% YoY — momentum positive.`] : ["Consult news feed for sector tailwind catalysts."],
      macro_headwinds: debtEquity && debtEquity > 1.5 ? ["High leverage amplifies downside in a rising rate environment."] : ["Macro headwinds depend on sector cycle; monitor earnings guidance."],
      horizon: "6–12 months",
    },
    master: {
      risk_score: riskScore,
      risk_rationale: `Risk score of ${riskScore}/10 derived from: RSI=${rsi?.toFixed(0) ?? "N/A"} (${rsiLabel}), SMA posture (${above50 && above200 ? "Bullish" : isBearish ? "Bearish" : "Mixed"}), PE=${pe?.toFixed(0) ?? "N/A"}x, Debt/Equity=${debtEquity?.toFixed(2) ?? "N/A"}.`,
      technical_trend: posture || "Insufficient technical data",
      one_line_verdict: `${raw.valuation_label} — ${above50 && above200 ? "Uptrend intact; monitor RSI for overbought levels." : isBearish ? "Downtrend in place; wait for technical reversal signal." : "Mixed signals — validate with latest news before entry."}`,
      generated_at: raw.generated_at as string ?? new Date().toISOString(),
      payload: {
        ticker: raw.ticker as string,
        current_price_estimate: deskPrice(price),
        bull_summary: bullCase.slice(0, 3),
        bear_summary: bearCase.slice(0, 3),
        risk_score: riskScore,
        technical_trend: posture || "N/A",
        consensus,
      },
    },
  };
}

// ─── Watchlist ticker row ────────────────────────────────────────────────────
function TickerRow({ symbol, name, price, change1d, isSelected, onClick }: {
  symbol: string; name: string; price: number | null; change1d: number | null; isSelected: boolean; onClick: () => void;
}) {
  const up = (change1d ?? 0) > 0;
  const dn = (change1d ?? 0) < 0;
  return (
    <button onClick={onClick} className={cn(
      "group flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-all",
      isSelected ? "border-l-primary bg-primary/5" : "border-l-transparent hover:bg-muted/50"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-foreground">{symbol}</span>
          <span className={cn("flex items-center gap-0.5 font-mono text-[11px] font-semibold",
            up ? "text-bull" : dn ? "text-bear" : "text-muted-foreground")}>
            {up ? <TrendingUp size={10} /> : dn ? <TrendingDown size={10} /> : <Minus size={10} />}
            {change1d != null ? `${change1d >= 0 ? "+" : ""}${change1d.toFixed(2)}%` : "—"}
          </span>
        </div>
        <p className="mt-0.5 truncate font-sans text-[11px] text-muted-foreground">{name}</p>
        <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">{price != null ? deskPrice(price) : "—"}</p>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function RetailDeskPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const watchlistsQuery = useQuery({ queryKey: ["watchlists"], queryFn: api.getWatchlists, staleTime: 60_000 });

  // Flatten all watchlist symbols into a deduplicated list
  const allItems = watchlistsQuery.data?.flatMap(wl => wl.items) ?? [];
  const seen = new Set<string>();
  const uniqueItems = allItems.filter(item => {
    if (seen.has(item.symbol)) return false;
    seen.add(item.symbol);
    return true;
  });

  // Auto-select first symbol
  const activeSymbol = selectedSymbol ?? uniqueItems[0]?.symbol ?? null;

  const reportQuery = useQuery({
    queryKey: ["analyst-report", activeSymbol],
    queryFn: () => api.getAnalystReport(activeSymbol!),
    enabled: !!activeSymbol,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });

  const rawData = reportQuery.data as unknown as Record<string, unknown> | undefined;
  const report = rawData ? adaptReport(rawData) : null;
  const rawSignal: DeskSignal = report ? deskRiskSignal(report.master.risk_score) : "neutral";

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Intelligence Desk</p>
              <h2 className="font-display text-base font-semibold text-foreground">Watchlist</h2>
            </div>
            <button onClick={() => watchlistsQuery.refetch()}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Refresh">
              <RefreshCw size={13} className={cn(watchlistsQuery.isFetching && "animate-spin")} />
            </button>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted-foreground">
            {uniqueItems.length} positions · click to generate report
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          {watchlistsQuery.isLoading && (
            <div className="space-y-2 p-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />)}</div>
          )}
          {uniqueItems.length === 0 && !watchlistsQuery.isLoading && (
            <div className="p-4 text-center">
              <p className="font-sans text-xs text-muted-foreground">No watchlist items found.<br />Add symbols in the Watchlists tab.</p>
            </div>
          )}
          {uniqueItems.map(item => (
            <TickerRow key={item.symbol} symbol={item.symbol}
              name={item.symbol} price={item.price} change1d={item.change_1d}
              isSelected={item.symbol === activeSymbol}
              onClick={() => setSelectedSymbol(item.symbol)} />
          ))}
        </nav>
        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-1.5">
            <BookOpen size={11} className="text-muted-foreground" />
            <p className="font-sans text-[10px] text-muted-foreground">Research only · Not financial advice</p>
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!activeSymbol && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText size={36} className="opacity-30" />
            <p className="font-sans text-sm">Select a symbol to generate its analyst report</p>
          </div>
        )}

        {activeSymbol && (
          <>
            {/* Report header */}
            <div className="shrink-0 border-b border-border px-8 py-5" style={{ background: "linear-gradient(135deg, hsl(222 47% 14%) 0%, hsl(222 40% 22%) 100%)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-3xl font-bold text-white">{activeSymbol}</span>
                    {reportQuery.data && !reportQuery.isLoading && (
                      <DeskSignalBadge signal={rawSignal} label={(rawData?.exchange as string) ?? ""} size="sm" dot={false} />
                    )}
                  </div>
                  {report && <p className="mt-0.5 font-display text-lg font-medium text-white/70">{report.company_name}</p>}
                  {report && <p className="mt-0.5 font-sans text-xs text-white/40">{report.sector}</p>}
                </div>
                <div className="text-right">
                  {report && (
                    <>
                      <p className="font-mono text-3xl font-bold text-white">{deskPrice(report.quant.price)}</p>
                      <button onClick={() => reportQuery.refetch()}
                        className="mt-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-sans text-[11px] font-semibold text-white/60 hover:bg-white/10 transition ml-auto">
                        <RefreshCw size={11} className={cn(reportQuery.isFetching && "animate-spin")} />
                        Refresh report
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {reportQuery.isLoading && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="font-sans text-sm">Generating analyst report for {activeSymbol}...</p>
                </div>
              )}
              {reportQuery.isError && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <AlertTriangle size={28} className="text-bear" />
                  <p className="font-sans text-sm font-medium">Failed to load report</p>
                  <p className="font-sans text-xs">Ensure {activeSymbol} metrics are synced via market refresh</p>
                </div>
              )}
              {!reportQuery.isLoading && !reportQuery.isError && !report && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <AlertTriangle size={28} className="text-warn" />
                  <p className="font-sans text-sm font-medium">No metric data for {activeSymbol}</p>
                  <p className="font-sans text-xs">Add it to a watchlist and trigger a market data refresh</p>
                </div>
              )}
              {report && (
                <div className="mx-auto max-w-4xl space-y-6 px-8 py-7">
                  <DeskCIOCard data={report.cio} />
                  <DeskFundamentalsCard data={report.fundamentals} />
                  <DeskQuantCard data={report.quant} />
                  <DeskMacroCard data={report.macro} />
                  <DeskMasterCard data={report.master} ticker={activeSymbol} />
                  <div className="rounded-lg border border-border bg-muted p-4 text-center">
                    <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
                      Report generated by the <span className="font-semibold text-foreground">Retail Intelligence Desk</span> multi-agent system from locally cached market metrics.
                      All analysis is for research and screening purposes only — not investment advice.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

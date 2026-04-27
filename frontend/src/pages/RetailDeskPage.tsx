import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { DeskCIOCard } from "@/components/desk/DeskCIOCard";
import { DeskFundamentalsCard } from "@/components/desk/DeskFundamentalsCard";
import { DeskMacroCard } from "@/components/desk/DeskMacroCard";
import { DeskMasterCard } from "@/components/desk/DeskMasterCard";
import { DeskQuantCard } from "@/components/desk/DeskQuantCard";
import { DeskRiskMeter } from "@/components/desk/DeskRiskMeter";
import { DeskSignalBadge } from "@/components/desk/DeskSignalBadge";
import { api } from "@/lib/api";
import type { AnalystReport, WatchlistItem } from "@/lib/types";
import type { Consensus, DeskAnalystReport, DeskSignal } from "@/lib/desk-types";
import { deskFmt, deskPriceForExchange, deskRiskSignal } from "@/lib/desk-utils";
import { cn } from "@/lib/utils";

const FALLBACK_BULL = ["Insufficient bullish evidence in cached metrics — refresh market data and validate with news/context."];
const FALLBACK_BEAR = ["Insufficient bearish evidence in cached metrics — treat this as low-confidence context."];

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") && value.length > 0 ? value : fallback;
}

function researchPosture(raw: AnalystReport, price: number, sma50: number | null, sma200: number | null): Consensus {
  const posture = `${raw.technical_posture ?? ""} ${raw.valuation_label ?? ""}`.toLowerCase();
  const above50 = sma50 != null && price > sma50;
  const above200 = sma200 != null && price > sma200;
  const risk = asNumber(raw.risk_score) ?? 5;
  if ((posture.includes("bullish") || (above50 && above200)) && risk <= 6.5) return "Constructive";
  if (posture.includes("bearish") || (!above50 && !above200 && sma50 != null && sma200 != null) || risk >= 7.5) return "Cautious";
  return "Neutral";
}

function postureSignal(consensus: Consensus, riskScore: number): DeskSignal {
  if (riskScore >= 7.5) return "bear";
  if (consensus === "Constructive") return "bull";
  if (consensus === "Cautious") return "bear";
  if (riskScore >= 5.5) return "warn";
  return "neutral";
}

function freshnessSignal(freshness?: string): DeskSignal {
  if (freshness === "fresh") return "bull";
  if (freshness === "recent") return "info";
  if (freshness === "stale") return "warn";
  return "neutral";
}

function adaptReport(raw: AnalystReport | undefined): DeskAnalystReport | null {
  if (!raw || raw.error) return null;

  const price = asNumber(raw.current_price) ?? 0;
  const rsi = asNumber(raw.rsi_14);
  const rsiLabel: "Overbought" | "Neutral" | "Oversold" =
    rsi == null ? "Neutral" : rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";

  const sma50 = asNumber(raw.sma_50);
  const sma200 = asNumber(raw.sma_200);
  const pe = asNumber(raw.pe);
  const pb = asNumber(raw.pb);
  const roe = asNumber(raw.roe);
  const roce = asNumber(raw.roce);
  const profitMargin = asNumber(raw.profit_margin);
  const revenueGrowth = asNumber(raw.revenue_growth);
  const debtEquity = asNumber(raw.debt_equity);
  const riskScore = asNumber(raw.risk_score) ?? 5;
  const bullCase = asStringArray(raw.bull_case, FALLBACK_BULL);
  const bearCase = asStringArray(raw.bear_case, FALLBACK_BEAR);
  const posture = asString(raw.technical_posture, "Insufficient cached metrics for a technical posture.");
  const valuation = asString(raw.valuation_label, "Valuation context unavailable from cached fundamentals.");
  const consensus = researchPosture(raw, price, sma50, sma200);
  const above50 = sma50 != null && price > sma50;
  const above200 = sma200 != null && price > sma200;
  const exchange = asString(raw.exchange, "N/A");
  const company = asString(raw.company_name, raw.ticker);
  const sector = raw.sector ?? raw.industry ?? "Equity";

  const riskDrivers = [
    `RSI ${rsi == null ? "unavailable" : `${rsi.toFixed(0)} (${rsiLabel})`}`,
    `trend ${above50 && above200 ? "screens constructive" : !above50 && !above200 && sma50 != null && sma200 != null ? "screens pressured" : "requires confirmation"}`,
    `valuation ${valuation}`,
    `debt/equity ${debtEquity == null ? "unavailable" : debtEquity.toFixed(2)}`,
  ];

  return {
    ticker: raw.ticker,
    company_name: company,
    exchange,
    sector,
    cio: {
      narrative: `${company} (${raw.ticker}) screens as ${posture.toLowerCase()} using locally cached market metrics. Current price is ${deskPriceForExchange(price, exchange)} and cached data freshness is ${raw.data_freshness ?? "unknown"}. Treat the view as research support and confirm with latest market/news data before acting.`,
      bullCase,
      bearCase,
      consensus,
      consensusRationale: `Algorithmic screening posture derived from cached technicals and fundamentals. ${valuation}. RSI: ${rsi == null ? "N/A" : rsi.toFixed(0)} (${rsiLabel}).`,
      analystCount: 1,
      buyCount: consensus === "Constructive" ? 1 : 0,
      holdCount: consensus === "Neutral" ? 1 : 0,
      sellCount: consensus === "Cautious" ? 1 : 0,
      priceTarget: sma200 ? deskPriceForExchange(sma200, exchange) : "—",
    },
    fundamentals: {
      revenue_growth_yoy: revenueGrowth != null ? revenueGrowth * 100 : null,
      is_profitable: profitMargin != null && profitMargin > 0,
      eps_ttm: asNumber(raw.eps),
      pe_trailing: pe,
      pe_forward: pe ? pe * 0.85 : null,
      price_to_sales: asNumber(raw.peg),
      price_to_book: pb,
      ev_ebitda: asNumber(raw.ev_ebitda),
      profit_margin: profitMargin,
      roe,
      roce,
      debt_equity: debtEquity,
      dividend_yield: asNumber(raw.dividend_yield),
      cash_bn: null,
      debt_bn: null,
      valuation_verdict: valuation,
      health_verdict: debtEquity == null
        ? "Balance-sheet leverage is unavailable in cached metrics."
        : debtEquity > 1.5
          ? "Leverage screens elevated; monitor balance-sheet risk and rate sensitivity."
          : "Leverage screens manageable based on cached debt/equity data.",
    },
    quant: {
      price,
      sma50,
      sma200,
      rsi14: rsi,
      rsi_label: rsiLabel,
      macd: asNumber(raw.macd),
      macd_signal: asNumber(raw.macd_signal),
      support: asNumber(raw.support_level),
      resistance: asNumber(raw.resistance_level),
      short_interest_pct: null,
      days_to_cover: null,
      atr14: asNumber(raw.atr_14),
      proximity_52w_high: asNumber(raw.proximity_52w_high),
      proximity_52w_low: asNumber(raw.proximity_52w_low),
      pcr: asNumber(raw.pcr),
      iv: asNumber(raw.iv),
      oi_change: asNumber(raw.oi_change),
      volume: asNumber(raw.volume),
      avg_volume_20d: asNumber(raw.avg_volume_20d),
      volume_spike: asNumber(raw.volume_spike),
      technical_posture: posture,
    },
    macro: {
      rate_sensitivity: debtEquity != null && debtEquity > 1 ? "Moderate Negative" : pe != null && pe > 50 ? "Moderate Negative" : "Neutral",
      rate_narrative: `${company} has ${debtEquity != null && debtEquity > 1 ? "higher leverage, which can add rate sensitivity" : "limited cached leverage pressure; rate sensitivity is mostly through valuation multiples and sector conditions"}. This is heuristic context, not a live macro model.`,
      regulatory_risks: ["No dedicated regulatory feed is available in the cached report; validate sector-specific filings and news."],
      geopolitical_risks: ["Geopolitical exposure is inferred from sector context only; review latest news for material events."],
      macro_tailwinds: revenueGrowth != null && revenueGrowth > 0
        ? [`Revenue growth screens positive at ${(revenueGrowth * 100).toFixed(1)}% YoY.`]
        : ["No clear macro tailwind in cached fundamentals; consult news and sector context."],
      macro_headwinds: debtEquity != null && debtEquity > 1.5
        ? ["Elevated leverage can amplify downside in tighter financial conditions."]
        : ["Macro headwinds depend on sector cycle, valuation sensitivity, and earnings revisions."],
      horizon: "6–12 months",
    },
    master: {
      risk_score: riskScore,
      risk_rationale: `Composite risk score of ${riskScore.toFixed(1)}/10 derived from ${riskDrivers.join(", ")}.`,
      technical_trend: posture,
      one_line_verdict: `${valuation} — ${above50 && above200 ? "trend screens constructive but requires current-data confirmation" : !above50 && !above200 && sma50 != null && sma200 != null ? "trend screens pressured; wait for confirmation before interpreting upside" : "mixed signals; validate with latest market and news context"}.`,
      generated_at: raw.generated_at ?? new Date().toISOString(),
      payload: {
        ticker: raw.ticker,
        current_price_estimate: deskPriceForExchange(price, exchange),
        bull_summary: bullCase.slice(0, 3),
        bear_summary: bearCase.slice(0, 3),
        risk_score: riskScore,
        technical_trend: posture,
        consensus,
      },
    },
  };
}

function TickerRow({ item, isSelected, onClick }: { item: WatchlistItem; isSelected: boolean; onClick: () => void }) {
  const change = item.change_1d ?? 0;
  const positive = change > 0;
  const negative = change < 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 border-l-2 px-5 py-3 text-left transition-all",
        isSelected ? "border-l-primary bg-primary/10" : "border-l-transparent hover:bg-muted/70",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-foreground">{item.symbol}</span>
          <DeskSignalBadge signal={positive ? "bull" : negative ? "bear" : "neutral"} label={positive ? "Up" : negative ? "Down" : "Flat"} size="sm" />
        </div>
        <p className="mt-1 font-sans text-[11px] text-muted-foreground">Cached watchlist quote</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold text-foreground">{deskPriceForExchange(item.price)}</p>
        <p className={cn("inline-flex items-center gap-0.5 font-mono text-xs font-semibold", positive ? "text-bull" : negative ? "text-bear" : "text-muted-foreground")}>
          {positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : null}
          {item.change_1d == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
        </p>
      </div>
    </button>
  );
}

function WatchlistSidebar({ items, activeSymbol, isLoading, isFetching, onRefresh, onSelect }: {
  items: WatchlistItem[];
  activeSymbol: string | null;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onSelect: (symbol: string) => void;
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-border bg-card md:w-80">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Watchlist</p>
            <h2 className="font-display text-lg font-semibold text-foreground">Active Coverage</h2>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-md border border-border bg-background p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Refresh watchlists"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="font-sans text-xs text-muted-foreground">{items.length} real symbols from backend watchlists</p>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto py-1">
        {isLoading && <div className="space-y-2 p-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!isLoading && items.length === 0 && (
          <div className="p-5 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 font-sans text-sm font-medium text-foreground">No coverage list yet</p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">Add symbols in Watchlists to generate Beacon-style reports here.</p>
          </div>
        )}
        {items.map((item) => <TickerRow key={item.symbol} item={item} isSelected={item.symbol === activeSymbol} onClick={() => onSelect(item.symbol)} />)}
      </nav>
      <div className="border-t border-border px-5 py-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          <p className="font-sans text-[10px] uppercase tracking-wider">Research support · No execution</p>
        </div>
      </div>
    </aside>
  );
}

function ReportHero({ activeSymbol, report, raw, isFetching, onRefresh }: {
  activeSymbol: string;
  report: DeskAnalystReport;
  raw: AnalystReport;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const change = raw.change_1d ?? 0;
  const positive = change >= 0;
  const signal = postureSignal(report.cio.consensus, report.master.risk_score);

  return (
    <header className="beacon-hero hero-glow shrink-0 border-b border-border px-6 py-6 text-white md:px-8">
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            <span>Retail Intelligence Desk</span>
            <span>•</span>
            <span>{report.exchange}</span>
            <DeskSignalBadge signal={freshnessSignal(raw.data_freshness)} label={`Data: ${raw.data_freshness ?? "unknown"}`} size="sm" />
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{activeSymbol}</h1>
            <span className="font-sans text-base text-white/70">{report.company_name}</span>
          </div>
          <p className="max-w-3xl font-sans text-sm leading-relaxed text-white/75">{report.cio.narrative}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-2xl font-semibold text-white">{deskPriceForExchange(report.quant.price, report.exchange)}</span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-semibold", positive ? "bg-bull/20 text-bull-soft" : "bg-bear/20 text-bear-soft")}>
              {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {raw.change_1d == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-sans text-xs text-white/80">Screening posture: {report.cio.consensus}</span>
            <DeskSignalBadge signal={signal} label={`Risk ${deskFmt(report.master.risk_score, 1)}/10`} />
          </div>
        </div>
        <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur md:w-72">
          <DeskRiskMeter score={report.master.risk_score} />
          <button
            onClick={onRefresh}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-sans text-xs font-semibold text-white/80 transition hover:bg-white/15"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh report
          </button>
        </div>
      </div>
    </header>
  );
}

export function RetailDeskPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const watchlistsQuery = useQuery({ queryKey: ["watchlists"], queryFn: api.getWatchlists, staleTime: 60_000 });

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return (watchlistsQuery.data?.flatMap((watchlist) => watchlist.items) ?? []).filter((item) => {
      if (seen.has(item.symbol)) return false;
      seen.add(item.symbol);
      return true;
    });
  }, [watchlistsQuery.data]);

  const activeSymbol = selectedSymbol ?? uniqueItems[0]?.symbol ?? null;

  const reportQuery = useQuery({
    queryKey: ["analyst-report", activeSymbol],
    queryFn: () => api.getAnalystReport(activeSymbol!),
    enabled: !!activeSymbol,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });

  const rawReport = reportQuery.data;
  const report = adaptReport(rawReport);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-panel md:flex-row">
      <WatchlistSidebar
        items={uniqueItems}
        activeSymbol={activeSymbol}
        isLoading={watchlistsQuery.isLoading}
        isFetching={watchlistsQuery.isFetching}
        onRefresh={() => void watchlistsQuery.refetch()}
        onSelect={setSelectedSymbol}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background-elevated">
        {!activeSymbol && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-40" />
            <p className="font-sans text-sm">Select a watchlist symbol to generate its Beacon-style analyst report.</p>
          </div>
        )}

        {activeSymbol && report && rawReport && (
          <ReportHero activeSymbol={activeSymbol} report={report} raw={rawReport} isFetching={reportQuery.isFetching} onRefresh={() => void reportQuery.refetch()} />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeSymbol && reportQuery.isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-sans text-sm">Generating analyst report for {activeSymbol}...</p>
            </div>
          )}

          {activeSymbol && reportQuery.isError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 text-bear" />
              <p className="font-sans text-sm font-semibold text-foreground">Failed to load report</p>
              <p className="font-sans text-xs">Ensure {activeSymbol} metrics are synced via market refresh.</p>
            </div>
          )}

          {activeSymbol && !reportQuery.isLoading && !reportQuery.isError && !report && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 text-warn" />
              <p className="font-sans text-sm font-semibold text-foreground">No metric data for {activeSymbol}</p>
              <p className="font-sans text-xs">Add it to a watchlist and trigger a market data refresh.</p>
            </div>
          )}

          {report && (
            <div className="mx-auto max-w-5xl space-y-6 px-5 py-6 md:px-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="beacon-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /><span className="label-eyebrow">Coverage</span></div>
                  <p className="mt-2 font-display text-lg font-semibold text-foreground">{report.sector ?? "Equity"}</p>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">Exchange: {report.exchange}</p>
                </div>
                <div className="beacon-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" /><span className="label-eyebrow">Posture</span></div>
                  <p className="mt-2 font-display text-lg font-semibold text-foreground">{report.cio.consensus}</p>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">Algorithmic screening label, not advice.</p>
                </div>
                <div className="beacon-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /><span className="label-eyebrow">Freshness</span></div>
                  <p className="mt-2 font-display text-lg font-semibold text-foreground">{rawReport?.data_freshness ?? "unknown"}</p>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">Generated {report.master.generated_at ? new Date(report.master.generated_at).toLocaleString() : "—"}</p>
                </div>
              </div>

              <DeskCIOCard data={report.cio} />
              <DeskFundamentalsCard data={report.fundamentals} />
              <DeskQuantCard data={report.quant} />
              <DeskMacroCard data={report.macro} />
              <DeskMasterCard data={report.master} ticker={activeSymbol} />

              <div className="rounded-2xl border border-border bg-warn-soft/60 p-4 text-center">
                <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">
                  Beacon-style report generated from locally cached market metrics. This is research and screening support only, not financial advice, suitability guidance, or a trading/execution signal.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

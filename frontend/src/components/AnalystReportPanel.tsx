import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AnalystReport } from "@/lib/types";

const fmt = (v: number | null | undefined, decimals = 2, suffix = "") =>
  v == null ? "—" : `${v.toFixed(decimals)}${suffix}`;
const pct = (v: number | null | undefined) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
const pctDirect = (v: number | null | undefined) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const RiskBar = ({ score }: { score: number }) => {
  const pct = (score / 10) * 100;
  const color =
    score <= 3 ? "bg-emerald-500" : score <= 6 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Risk Score</span>
        <span className={`font-bold font-mono text-sm ${score <= 3 ? "text-emerald-600" : score <= 6 ? "text-amber-600" : "text-rose-600"}`}>
          {score} / 10
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
        <span>LOW</span><span>MEDIUM</span><span>HIGH</span>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "neutral" }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`text-xs font-mono font-semibold ${
      tone === "green" ? "text-emerald-600" : tone === "red" ? "text-rose-600" : "text-slate-800"
    }`}>{value}</span>
  </div>
);

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="text-violet-600">{icon}</div>
    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
  </div>
);

const FreshnessTag = ({ freshness }: { freshness: string }) => {
  const config: Record<string, { cls: string; label: string }> = {
    fresh:   { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Data Fresh" },
    recent:  { cls: "bg-amber-50 text-amber-700 border-amber-200",       label: "Data Recent" },
    stale:   { cls: "bg-rose-50 text-rose-700 border-rose-200",          label: "Data Stale" },
    missing: { cls: "bg-slate-100 text-slate-500 border-slate-200",      label: "No Data" },
  };
  const c = config[freshness] ?? config.missing;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase ${c.cls}`}>
      {c.label}
    </span>
  );
};

const PostureTag = ({ posture }: { posture: string }) => {
  const isBull = posture.toLowerCase().includes("bullish");
  const isBear = posture.toLowerCase().includes("bearish");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
      isBull ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
      isBear ? "bg-rose-50 text-rose-700 border-rose-200" :
               "bg-amber-50 text-amber-700 border-amber-200"
    }`}>
      {isBull ? <TrendingUp size={11} /> : isBear ? <TrendingDown size={11} /> : null}
      {posture}
    </span>
  );
};

// ---------- The main report panel ----------
export const AnalystReportPanel = ({
  symbol,
  onClose,
}: {
  symbol: string;
  onClose: () => void;
}) => {
  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ["analyst-report", symbol],
    queryFn: () => api.getAnalystReport(symbol),
    staleTime: 300_000,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-slate-900">{symbol}</span>
              {report && <FreshnessTag freshness={report.data_freshness} />}
            </div>
            {report && !report.error && (
              <p className="text-xs text-slate-500 mt-0.5">{report.company_name} · {report.exchange} {report.sector ? `· ${report.sector}` : ""}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="Refresh report"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 p-16 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
            <p className="text-sm">Generating analyst report for {symbol}...</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 p-16 text-rose-500">
            <AlertTriangle size={32} />
            <p className="text-sm font-medium">Failed to load report. Is the symbol in a watchlist and synced?</p>
          </div>
        )}

        {report?.error && (
          <div className="m-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">No Data Available</p>
            <p>{report.error}</p>
            <p className="mt-2 text-xs text-amber-600">Add {symbol} to a watchlist and refresh market data to generate this report.</p>
          </div>
        )}

        {report && !report.error && (
          <div className="p-6 space-y-6">
            {/* Price snapshot */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-mono text-slate-400 uppercase mb-1">Current Price</p>
                  <p className="font-display text-4xl font-bold text-slate-900">{fmt(report.current_price)}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${(report.change_1d ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {(report.change_1d ?? 0) >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {pctDirect(report.change_1d)} today
                  </div>
                  <p className="text-xs text-slate-400">1M: {pctDirect(report.change_1m)} · 1Y: {pctDirect(report.change_1y)}</p>
                  <PostureTag posture={report.technical_posture} />
                </div>
              </div>
            </div>

            {/* Risk score */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <RiskBar score={report.risk_score} />
            </div>

            {/* Bull / Bear cases */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <TrendingUp size={15} />
                  <span className="text-xs font-bold uppercase tracking-wider">Bull Case</span>
                </div>
                <ul className="space-y-2">
                  {report.bull_case.map((b, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-700">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 mt-1.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-700">
                  <TrendingDown size={15} />
                  <span className="text-xs font-bold uppercase tracking-wider">Bear Case</span>
                </div>
                <ul className="space-y-2">
                  {report.bear_case.map((b, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-700">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400 mt-1.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Technical */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <SectionHeader icon={<BarChart2 size={16} />} title="Technical Posture" />
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <MetricRow label="50-Day SMA" value={fmt(report.sma_50)} tone={report.current_price && report.sma_50 ? (report.current_price > report.sma_50 ? "green" : "red") : "neutral"} />
                  <MetricRow label="200-Day SMA" value={fmt(report.sma_200)} tone={report.current_price && report.sma_200 ? (report.current_price > report.sma_200 ? "green" : "red") : "neutral"} />
                  <MetricRow label="RSI (14)" value={`${fmt(report.rsi_14, 1)} · ${report.rsi_label}`} tone={report.rsi_14 && report.rsi_14 >= 70 ? "red" : report.rsi_14 && report.rsi_14 <= 30 ? "green" : "neutral"} />
                  <MetricRow label="MACD" value={fmt(report.macd, 3)} tone={report.macd && report.macd_signal ? (report.macd > report.macd_signal ? "green" : "red") : "neutral"} />
                </div>
                <div>
                  <MetricRow label="ATR (14)" value={fmt(report.atr_14)} />
                  <MetricRow label="Support" value={fmt(report.support_level)} tone="green" />
                  <MetricRow label="Resistance" value={fmt(report.resistance_level)} tone="red" />
                  <MetricRow label="52W High Prox." value={fmt(report.proximity_52w_high, 1, "%")} />
                </div>
              </div>
            </div>

            {/* Fundamentals */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <SectionHeader icon={<BookOpen size={16} />} title="Fundamentals" />
              <div className="mb-3">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  report.valuation_label.includes("Over") ? "bg-rose-50 text-rose-700 border-rose-200" :
                  report.valuation_label.includes("Under") ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                }`}>{report.valuation_label}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <MetricRow label="P/E Ratio" value={fmt(report.pe, 1, "x")} tone={report.pe && report.pe > 40 ? "red" : "neutral"} />
                  <MetricRow label="P/B Ratio" value={fmt(report.pb, 1, "x")} />
                  <MetricRow label="PEG Ratio" value={fmt(report.peg, 2)} />
                  <MetricRow label="EV/EBITDA" value={fmt(report.ev_ebitda, 1, "x")} />
                </div>
                <div>
                  <MetricRow label="Profit Margin" value={pct(report.profit_margin)} tone={report.profit_margin && report.profit_margin > 0 ? "green" : "red"} />
                  <MetricRow label="Revenue Growth" value={pct(report.revenue_growth)} tone={report.revenue_growth && report.revenue_growth > 0 ? "green" : "red"} />
                  <MetricRow label="ROE" value={pct(report.roe)} tone={report.roe && report.roe > 0.12 ? "green" : "neutral"} />
                  <MetricRow label="Debt / Equity" value={fmt(report.debt_equity, 2)} tone={report.debt_equity && report.debt_equity > 1.5 ? "red" : "neutral"} />
                </div>
              </div>
              {report.dividend_yield && report.dividend_yield > 0 && (
                <MetricRow label="Dividend Yield" value={pct(report.dividend_yield)} tone="green" />
              )}
            </div>

            {/* Options/Volume */}
            {(report.pcr || report.iv || report.volume_spike) && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <SectionHeader icon={<Cpu size={16} />} title="Options & Volume Flow" />
                <div className="grid grid-cols-2 gap-x-6">
                  <div>
                    <MetricRow label="Put/Call Ratio" value={fmt(report.pcr, 2)} tone={report.pcr && report.pcr > 1.2 ? "red" : report.pcr && report.pcr < 0.7 ? "green" : "neutral"} />
                    <MetricRow label="Implied Volatility" value={fmt(report.iv, 1, "%")} />
                  </div>
                  <div>
                    <MetricRow label="Volume Spike" value={fmt(report.volume_spike, 2, "x")} tone={report.volume_spike && report.volume_spike > 2 ? "green" : "neutral"} />
                    <MetricRow label="OI Change" value={fmt(report.oi_change, 0)} />
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex gap-2">
                <Shield size={14} className="shrink-0 text-slate-400 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  This report is generated algorithmically from locally cached market metrics. It is for research and screening support only — not financial advice. Data freshness: <span className="font-mono font-semibold">{report.data_freshness}</span>. Generated: {new Date(report.generated_at).toLocaleTimeString()}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

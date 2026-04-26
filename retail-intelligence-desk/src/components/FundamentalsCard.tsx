import { AgentSection } from "@/components/AgentSection";
import { SignalBadge } from "@/components/SignalBadge";
import { fmt, fmtPct, fmtBn } from "@/lib/utils";
import type { FundamentalsReport } from "@/lib/types";

function MetricRow({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "warn" }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="font-sans text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-semibold ${
        tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-warn" : "text-foreground"
      }`}>{value}</span>
    </div>
  );
}

interface Props { data: FundamentalsReport; }

export function FundamentalsCard({ data }: Props) {
  const healthSignal = data.health_verdict.toLowerCase().includes("fort") ? "bull" as const
    : data.health_verdict.toLowerCase().includes("strong") ? "bull" as const : "warn" as const;
  return (
    <AgentSection
      agentNumber={2} agentLabel="Fundamental & Risk Agent"
      title="Balance Sheet & Valuation" subtitle="Growth · profitability · valuation multiples · financial health"
      badge={<SignalBadge signal={healthSignal} label={data.is_profitable ? "Profitable" : "Pre-Profit"} />}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Valuation */}
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valuation Multiples</p>
          <MetricRow label="Trailing P/E" value={fmt(data.pe_trailing, 1, "x")} tone={data.pe_trailing && data.pe_trailing > 50 ? "bear" : data.pe_trailing && data.pe_trailing < 20 ? "bull" : undefined} />
          <MetricRow label="Forward P/E" value={fmt(data.pe_forward, 1, "x")} />
          <MetricRow label="Price / Sales (TTM)" value={fmt(data.price_to_sales, 1, "x")} tone={data.price_to_sales && data.price_to_sales > 15 ? "warn" : undefined} />
          <MetricRow label="Price / Book" value={fmt(data.price_to_book, 1, "x")} />
          <MetricRow label="EV / EBITDA" value={fmt(data.ev_ebitda, 1, "x")} />
        </div>
        {/* Profitability */}
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Profitability</p>
          <MetricRow label="Revenue Growth YoY" value={fmtPct(data.revenue_growth_yoy, false)} tone={data.revenue_growth_yoy && data.revenue_growth_yoy > 0 ? "bull" : "bear"} />
          <MetricRow label="Profit Margin" value={fmtPct(data.profit_margin)} tone={data.profit_margin && data.profit_margin > 0.15 ? "bull" : data.profit_margin && data.profit_margin < 0 ? "bear" : undefined} />
          <MetricRow label="EPS (TTM)" value={fmt(data.eps_ttm, 2)} />
          <MetricRow label="Return on Equity" value={fmtPct(data.roe)} tone={data.roe && data.roe > 0.15 ? "bull" : undefined} />
          <MetricRow label="Debt / Equity" value={fmt(data.debt_equity, 2)} tone={data.debt_equity && data.debt_equity > 1.5 ? "bear" : undefined} />
        </div>
      </div>

      {/* Health & Valuation Verdicts */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-muted p-3">
          <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Balance Sheet</p>
          <div className="mt-1.5 flex gap-4">
            <div><p className="font-mono text-base font-bold text-foreground">{fmtBn(data.cash_bn)}</p><p className="font-sans text-[11px] text-muted-foreground">Cash</p></div>
            <div><p className="font-mono text-base font-bold text-foreground">{fmtBn(data.debt_bn)}</p><p className="font-sans text-[11px] text-muted-foreground">Debt</p></div>
          </div>
          <p className="mt-2 font-sans text-xs text-foreground/75">{data.health_verdict}</p>
        </div>
        <div className="rounded-md border border-border bg-muted p-3">
          <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valuation Verdict</p>
          <p className="mt-2 font-sans text-xs text-foreground/75">{data.valuation_verdict}</p>
        </div>
      </div>
    </AgentSection>
  );
}

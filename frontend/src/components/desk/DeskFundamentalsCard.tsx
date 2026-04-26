import { DeskAgentSection } from "./DeskAgentSection";
import { DeskSignalBadge } from "./DeskSignalBadge";
import { deskFmt, deskPct } from "@/lib/desk-utils";
import type { DeskFundamentals } from "@/lib/desk-types";

function Row({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "warn" }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="font-sans text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-semibold ${tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-warn" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function DeskFundamentalsCard({ data }: { data: DeskFundamentals }) {
  return (
    <DeskAgentSection agentNumber={2} agentLabel="Fundamental & Risk Agent"
      title="Balance Sheet & Valuation" subtitle="Growth · profitability · valuation multiples · financial health"
      badge={<DeskSignalBadge signal={data.is_profitable ? "bull" : "warn"} label={data.is_profitable ? "Profitable" : "Pre-Profit"} />}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valuation Multiples</p>
          <Row label="Trailing P/E" value={deskFmt(data.pe_trailing, 1, "x")} tone={data.pe_trailing && data.pe_trailing > 50 ? "bear" : data.pe_trailing && data.pe_trailing < 20 ? "bull" : undefined} />
          <Row label="Forward P/E" value={deskFmt(data.pe_forward, 1, "x")} />
          <Row label="Price / Sales" value={deskFmt(data.price_to_sales, 1, "x")} tone={data.price_to_sales && data.price_to_sales > 15 ? "warn" : undefined} />
          <Row label="Price / Book" value={deskFmt(data.price_to_book, 1, "x")} />
          <Row label="EV / EBITDA" value={deskFmt(data.ev_ebitda, 1, "x")} />
        </div>
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Profitability</p>
          <Row label="Revenue Growth YoY" value={deskPct(data.revenue_growth_yoy, false)} tone={data.revenue_growth_yoy && data.revenue_growth_yoy > 0 ? "bull" : "bear"} />
          <Row label="Profit Margin" value={deskPct(data.profit_margin)} tone={data.profit_margin && data.profit_margin > 0.1 ? "bull" : data.profit_margin && data.profit_margin < 0 ? "bear" : undefined} />
          <Row label="EPS (TTM)" value={deskFmt(data.eps_ttm, 2)} />
          <Row label="Return on Equity" value={deskPct(data.roe)} tone={data.roe && data.roe > 0.15 ? "bull" : undefined} />
          <Row label="Debt / Equity" value={deskFmt(data.debt_equity, 2)} tone={data.debt_equity && data.debt_equity > 1.5 ? "bear" : undefined} />
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Balance Sheet</p>
          <div className="mt-1.5 flex gap-5">
            <div><p className="font-mono text-base font-bold text-foreground">${data.cash_bn?.toFixed(1)}B</p><p className="font-sans text-[11px] text-muted-foreground">Cash</p></div>
            <div><p className="font-mono text-base font-bold text-foreground">${data.debt_bn?.toFixed(1)}B</p><p className="font-sans text-[11px] text-muted-foreground">Debt</p></div>
          </div>
          <p className="mt-2 font-sans text-xs text-foreground/75">{data.health_verdict}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valuation Verdict</p>
          <p className="mt-2 font-sans text-xs text-foreground/75">{data.valuation_verdict}</p>
        </div>
      </div>
    </DeskAgentSection>
  );
}

import { AgentSection } from "@/components/AgentSection";
import { SignalBadge } from "@/components/SignalBadge";
import { fmt, fmtPrice } from "@/lib/utils";
import type { QuantReport } from "@/lib/types";
import type { Signal } from "@/lib/types";

function MiniRow({ label, value, tone }: { label: string; value: string; tone?: Signal }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="font-sans text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-semibold ${
        tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-warn" : "text-foreground"
      }`}>{value}</span>
    </div>
  );
}

interface Props { data: QuantReport; }

export function QuantTechCard({ data }: Props) {
  const above50 = data.sma50 != null && data.price > data.sma50;
  const above200 = data.sma200 != null && data.price > data.sma200;
  const postureSignal: Signal = above50 && above200 ? "bull" : !above50 && !above200 ? "bear" : "warn";
  const rsiSignal: Signal = data.rsi_label === "Overbought" ? "warn" : data.rsi_label === "Oversold" ? "info" : "neutral";

  return (
    <AgentSection
      agentNumber={3} agentLabel="Quant & Technical Agent"
      title="Price Action & Flows" subtitle="Moving averages · support/resistance · RSI · short interest"
      badge={<SignalBadge signal={postureSignal} label={above50 && above200 ? "Bullish" : !above50 && !above200 ? "Bearish" : "Mixed"} />}
    >
      {/* SMA posture bar */}
      <div className="mb-5 rounded-md border border-border bg-muted p-4">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs font-semibold text-foreground">Price vs. Moving Averages</span>
          <span className="font-mono text-sm font-bold text-foreground">{fmtPrice(data.price)}</span>
        </div>
        <div className="mt-3 space-y-2.5">
          {[{ label: "50-Day SMA", val: data.sma50 }, { label: "200-Day SMA", val: data.sma200 }].map(({ label, val }) => {
            const above = val != null && data.price > val;
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-sans text-muted-foreground">{label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{fmtPrice(val)}</span>
                    <SignalBadge signal={above ? "bull" : "bear"} label={above ? "Above" : "Below"} size="sm" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Levels */}
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Levels</p>
          <MiniRow label="Support (Floor)" value={fmtPrice(data.support)} tone="bull" />
          <MiniRow label="Resistance (Ceiling)" value={fmtPrice(data.resistance)} tone="bear" />
          <MiniRow label="ATR (14)" value={fmt(data.atr14, 2)} />
        </div>
        {/* Momentum */}
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Momentum</p>
          <MiniRow label={`RSI (14) — ${data.rsi_label}`} value={fmt(data.rsi14, 1)} tone={rsiSignal} />
          <MiniRow label="MACD" value={fmt(data.macd, 3)} tone={data.macd != null && data.macd_signal != null && data.macd > data.macd_signal ? "bull" : "bear"} />
          <MiniRow label="MACD Signal" value={fmt(data.macd_signal, 3)} />
        </div>
      </div>

      {/* Short interest */}
      <div className="mt-4 rounded-md border border-border bg-muted p-3">
        <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Short Interest</p>
        <div className="flex gap-6">
          <div><p className="font-mono text-base font-bold text-foreground">{fmt(data.short_interest_pct, 1)}%</p><p className="font-sans text-[11px] text-muted-foreground">% Float Short</p></div>
          <div><p className="font-mono text-base font-bold text-foreground">{fmt(data.days_to_cover, 1)}d</p><p className="font-sans text-[11px] text-muted-foreground">Days to Cover</p></div>
          <div className="flex items-end pb-0.5">
            <SignalBadge signal={(data.short_interest_pct ?? 0) > 15 ? "warn" : "neutral"} label={(data.short_interest_pct ?? 0) > 15 ? "Squeeze Risk" : "No Squeeze Risk"} size="sm" />
          </div>
        </div>
      </div>

      <p className="mt-4 font-sans text-xs text-muted-foreground">{data.technical_posture}</p>
    </AgentSection>
  );
}

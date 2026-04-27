import { DeskAgentSection } from "./DeskAgentSection";
import { DeskSignalBadge } from "./DeskSignalBadge";
import { deskCompact, deskFmt, deskPrice } from "@/lib/desk-utils";
import type { DeskQuant } from "@/lib/desk-types";

function Row({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" | "warn" | "info" }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="font-sans text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs font-semibold ${tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-warn" : tone === "info" ? "text-info" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function DeskQuantCard({ data }: { data: DeskQuant }) {
  const above50 = data.sma50 != null && data.price > data.sma50;
  const above200 = data.sma200 != null && data.price > data.sma200;
  const hasSma50 = data.sma50 != null;
  const hasSma200 = data.sma200 != null;
  const postureSig = !hasSma50 && !hasSma200 ? "neutral" as const : hasSma50 && hasSma200 && above50 && above200 ? "bull" as const : hasSma50 && hasSma200 && !above50 && !above200 ? "bear" as const : "warn" as const;
  const postureLabel = postureSig === "bull" ? "Constructive trend" : postureSig === "bear" ? "Pressured trend" : postureSig === "warn" ? "Partial/Mixed trend" : "Trend unavailable";
  const macdTone = data.macd == null || data.macd_signal == null ? undefined : data.macd > data.macd_signal ? "bull" as const : "bear" as const;

  return (
    <DeskAgentSection agentNumber={3} agentLabel="Quant & Technical Agent"
      title="Price Action & Flows" subtitle="Moving averages · support/resistance · RSI · short interest"
      badge={<DeskSignalBadge signal={postureSig} label={postureLabel} />}>
      {/* SMA posture */}
      <div className="mb-5 rounded-lg border border-border bg-muted p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans text-xs font-semibold text-foreground">Price vs. Moving Averages</span>
          <span className="font-mono text-sm font-bold text-foreground">{deskPrice(data.price)}</span>
        </div>
        {[{ label: "50-Day SMA", val: data.sma50 }, { label: "200-Day SMA", val: data.sma200 }].map(({ label, val }) => {
          const above = val != null && data.price > val;
          return (
            <div key={label} className="flex items-center justify-between py-1.5">
              <span className="font-sans text-xs text-muted-foreground">{label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground">{deskPrice(val)}</span>
                <DeskSignalBadge signal={val == null ? "neutral" : above ? "bull" : "bear"} label={val == null ? "N/A" : above ? "Above" : "Below"} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Levels</p>
          <Row label="Support (Floor)" value={deskPrice(data.support)} tone="bull" />
          <Row label="Resistance (Ceiling)" value={deskPrice(data.resistance)} tone="bear" />
          <Row label="ATR (14)" value={deskFmt(data.atr14, 2)} />
          <Row label="52W High Gap" value={deskFmt(data.proximity_52w_high, 1, "%")} tone={data.proximity_52w_high != null && data.proximity_52w_high < 5 ? "warn" : undefined} />
          <Row label="52W Low Cushion" value={deskFmt(data.proximity_52w_low, 1, "%")} tone={data.proximity_52w_low != null && data.proximity_52w_low > 25 ? "bull" : undefined} />
        </div>
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Momentum</p>
          <Row label={`RSI (14) — ${data.rsi_label}`} value={deskFmt(data.rsi14, 1)}
            tone={data.rsi_label === "Overbought" ? "warn" : data.rsi_label === "Oversold" ? "info" : undefined} />
          <Row label="MACD" value={deskFmt(data.macd, 3)}
            tone={macdTone} />
          <Row label="MACD Signal" value={deskFmt(data.macd_signal, 3)} />
          <Row label="Put/Call Ratio" value={deskFmt(data.pcr, 2)} />
          <Row label="Implied Volatility" value={deskFmt(data.iv, 1, "%")} />
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-muted p-3">
        <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Flow & Volume Context</p>
        <div className="flex items-end gap-5">
          <div><p className="font-mono text-base font-bold text-foreground">{deskCompact(data.volume)}</p><p className="font-sans text-[11px] text-muted-foreground">Volume</p></div>
          <div><p className="font-mono text-base font-bold text-foreground">{deskCompact(data.avg_volume_20d)}</p><p className="font-sans text-[11px] text-muted-foreground">20D Avg</p></div>
          <div><p className="font-mono text-base font-bold text-foreground">{deskFmt(data.volume_spike, 2, "x")}</p><p className="font-sans text-[11px] text-muted-foreground">Spike</p></div>
          <DeskSignalBadge signal={(data.volume_spike ?? 0) > 2 ? "warn" : "neutral"} label={(data.volume_spike ?? 0) > 2 ? "Volume Spike" : "Normal Flow"} size="sm" />
        </div>
      </div>
      <p className="mt-4 font-sans text-xs text-muted-foreground">{data.technical_posture}</p>
    </DeskAgentSection>
  );
}

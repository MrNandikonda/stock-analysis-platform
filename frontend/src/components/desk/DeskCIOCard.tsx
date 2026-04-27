import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { DeskAgentSection } from "./DeskAgentSection";
import { DeskSignalBadge } from "./DeskSignalBadge";
import type { DeskCIOSummary, Consensus } from "@/lib/desk-types";

function cSig(c: Consensus) {
  if (c === "Constructive") return "bull" as const;
  if (c === "Cautious") return "bear" as const;
  return "warn" as const;
}

export function DeskCIOCard({ data }: { data: DeskCIOSummary }) {
  const total = Math.max(1, data.buyCount + data.holdCount + data.sellCount);
  return (
    <DeskAgentSection agentNumber={1} agentLabel="Chief Investment Officer"
      title="Executive Summary" subtitle="60-second narrative · screening posture · bull/bear thesis"
      badge={<DeskSignalBadge signal={cSig(data.consensus)} label={data.consensus} />}>
      <p className="font-sans text-sm leading-relaxed text-foreground/80">{data.narrative}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-bull/20 bg-bull-soft p-4">
          <div className="mb-3 flex items-center gap-1.5 text-bull">
            <TrendingUp size={14} /><span className="font-sans text-[11px] font-bold uppercase tracking-wider">Bull Case</span>
          </div>
          <ul className="space-y-2">
            {data.bullCase.map((b, i) => (
              <li key={i} className="flex gap-2 font-sans text-xs leading-relaxed text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" />{b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-bear/20 bg-bear-soft p-4">
          <div className="mb-3 flex items-center gap-1.5 text-bear">
            <TrendingDown size={14} /><span className="font-sans text-[11px] font-bold uppercase tracking-wider">Bear Case</span>
          </div>
          <ul className="space-y-2">
            {data.bearCase.map((b, i) => (
              <li key={i} className="flex gap-2 font-sans text-xs leading-relaxed text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bear" />{b}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-muted p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users size={13} className="text-muted-foreground" />
            <span className="font-sans text-xs font-semibold text-foreground">Screening Posture</span>
            <DeskSignalBadge signal={cSig(data.consensus)} label={data.consensus} size="sm" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{data.analystCount} rule-based screen</span>
        </div>
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
          <div className="bg-bull" style={{ width: `${(data.buyCount / total) * 100}%` }} />
          <div className="bg-warn" style={{ width: `${(data.holdCount / total) * 100}%` }} />
          <div className="bg-bear" style={{ width: `${(data.sellCount / total) * 100}%` }} />
        </div>
        <div className="mt-2 flex gap-4 font-sans text-[11px] text-muted-foreground">
          <span><span className="font-semibold text-bull">{data.buyCount}</span> Constructive</span>
          <span><span className="font-semibold text-warn">{data.holdCount}</span> Neutral</span>
          <span><span className="font-semibold text-bear">{data.sellCount}</span> Cautious</span>
          <span className="ml-auto">Reference: <span className="font-semibold text-foreground">{data.priceTarget}</span></span>
        </div>
        <p className="mt-3 font-sans text-xs text-muted-foreground">{data.consensusRationale}</p>
      </div>
    </DeskAgentSection>
  );
}

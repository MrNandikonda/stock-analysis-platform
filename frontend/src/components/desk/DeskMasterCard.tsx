import { DeskAgentSection } from "./DeskAgentSection";
import { DeskSignalBadge } from "./DeskSignalBadge";
import { DeskRiskMeter } from "./DeskRiskMeter";
import { deskRiskSignal } from "@/lib/desk-utils";
import type { DeskMasterSynthesis } from "@/lib/desk-types";

export function DeskMasterCard({ data, ticker }: { data: DeskMasterSynthesis; ticker: string }) {
  return (
    <DeskAgentSection agentNumber={5} agentLabel="Master Agent — Final Synthesis"
      title="Risk Score & Dashboard Payload" subtitle="Composite risk · one-line verdict · JSON widget data"
      badge={<DeskSignalBadge signal={deskRiskSignal(data.risk_score)} label={`Risk ${data.risk_score}/10`} />}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0"><DeskRiskMeter score={data.risk_score} /></div>
        <div className="flex-1 space-y-3">
          <div className="rounded-lg border border-border bg-muted p-4">
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">One-Line Verdict</p>
            <p className="mt-1.5 font-display text-base font-semibold text-foreground leading-snug">{data.one_line_verdict}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted p-4">
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Risk Rationale</p>
            <p className="mt-1.5 font-sans text-xs leading-relaxed text-foreground/80">{data.risk_rationale}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-sans text-xs text-muted-foreground shrink-0 mt-0.5">Technical trend:</span>
            <span className="font-mono text-xs text-foreground">{data.technical_trend}</span>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Frontend Dashboard JSON Payload</p>
          <DeskSignalBadge signal="info" label="JSON" size="sm" dot={false} />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-border p-4 font-mono text-[11px] leading-relaxed text-foreground/80 bg-muted scrollbar-thin">
          {JSON.stringify(data.payload, null, 2)}
        </pre>
      </div>
      <p className="mt-4 font-sans text-[10px] text-muted-foreground">
        Report: {new Date(data.generated_at).toLocaleString()} · {ticker} · Research support only — not financial advice.
      </p>
    </DeskAgentSection>
  );
}

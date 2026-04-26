import { AgentSection } from "@/components/AgentSection";
import { SignalBadge } from "@/components/SignalBadge";
import { RiskMeter } from "@/components/RiskMeter";
import { riskToSignal } from "@/lib/utils";
import type { MasterSynthesis } from "@/lib/types";

interface Props { data: MasterSynthesis; ticker: string; }

export function MasterSynthesisCard({ data, ticker }: Props) {
  return (
    <AgentSection
      agentNumber={5} agentLabel="Master Agent — Final Synthesis"
      title="Risk Score & JSON Payload"
      subtitle="Composite risk · one-line verdict · dashboard widget data"
      badge={<SignalBadge signal={riskToSignal(data.risk_score)} label={`Risk ${data.risk_score}/10`} />}
    >
      {/* Risk meter + verdict */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <RiskMeter score={data.risk_score} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="rounded-md border border-border bg-muted p-4">
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">One-Line Verdict</p>
            <p className="mt-1.5 font-display text-base font-semibold text-foreground leading-snug">{data.one_line_verdict}</p>
          </div>
          <div className="rounded-md border border-border bg-muted p-4">
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Risk Rationale</p>
            <p className="mt-1.5 font-sans text-xs leading-relaxed text-foreground/80">{data.risk_rationale}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-muted-foreground">Technical trend:</span>
            <span className="font-mono text-xs text-foreground">{data.technical_trend}</span>
          </div>
        </div>
      </div>

      {/* JSON payload */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Frontend Dashboard Payload</p>
          <SignalBadge signal="info" label="JSON" size="sm" dot={false} />
        </div>
        <pre className="overflow-x-auto rounded-md border border-border bg-primary p-4 font-mono text-[11px] leading-relaxed text-primary-foreground scrollbar-thin">
          {JSON.stringify(data.payload, null, 2)}
        </pre>
      </div>

      {/* Footer */}
      <p className="mt-4 font-sans text-[10px] text-muted-foreground">
        Report generated: {new Date(data.generated_at).toLocaleString()} · Ticker: {ticker} · Research support only — not financial advice.
      </p>
    </AgentSection>
  );
}

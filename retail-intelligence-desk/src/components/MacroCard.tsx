import { AgentSection } from "@/components/AgentSection";
import { SignalBadge } from "@/components/SignalBadge";
import type { MacroReport } from "@/lib/types";
import type { Signal } from "@/lib/types";

function rateToSignal(r: MacroReport["rate_sensitivity"]): Signal {
  if (r.includes("High Positive") || r.includes("Moderate Positive")) return "bull";
  if (r.includes("High Negative") || r.includes("Moderate Negative")) return "bear";
  return "neutral";
}

function RiskList({ items, tone }: { items: string[]; tone: Signal }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 font-sans text-xs leading-relaxed text-foreground/80">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
            tone === "bull" ? "bg-bull" : tone === "bear" ? "bg-bear" : tone === "warn" ? "bg-warn" : "bg-info"
          }`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

interface Props { data: MacroReport; }

export function MacroCard({ data }: Props) {
  const rateSig = rateToSignal(data.rate_sensitivity);
  return (
    <AgentSection
      agentNumber={4} agentLabel="Macro & Geopolitical Agent"
      title="Sector Headwinds & Tailwinds" subtitle={`Horizon: ${data.horizon} · rates · regulation · geopolitics`}
      badge={<SignalBadge signal={rateSig} label={`Rate: ${data.rate_sensitivity}`} />}
    >
      {/* Rate sensitivity */}
      <div className="mb-5 rounded-md border border-border bg-muted p-4">
        <p className="mb-1 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Interest Rate Impact</p>
        <p className="font-sans text-sm leading-relaxed text-foreground/80">{data.rate_narrative}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-bull">Macro Tailwinds</p>
          <RiskList items={data.macro_tailwinds} tone="bull" />
        </div>
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-bear">Macro Headwinds</p>
          <RiskList items={data.macro_headwinds} tone="bear" />
        </div>
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-warn">Regulatory Risks</p>
          <RiskList items={data.regulatory_risks} tone="warn" />
        </div>
        <div>
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-wider text-info">Geopolitical Risks</p>
          <RiskList items={data.geopolitical_risks} tone="info" />
        </div>
      </div>
    </AgentSection>
  );
}

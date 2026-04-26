import { DeskAgentSection } from "./DeskAgentSection";
import { DeskSignalBadge } from "./DeskSignalBadge";
import type { DeskMacro } from "@/lib/desk-types";
import type { DeskSignal } from "@/lib/desk-types";

function RiskList({ items, tone }: { items: string[]; tone: DeskSignal }) {
  const dotClass = tone === "bull" ? "bg-bull" : tone === "bear" ? "bg-bear" : tone === "warn" ? "bg-warn" : "bg-info";
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 font-sans text-xs leading-relaxed text-foreground/80">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />{item}
        </li>
      ))}
    </ul>
  );
}

export function DeskMacroCard({ data }: { data: DeskMacro }) {
  const rateSig: DeskSignal =
    data.rate_sensitivity.includes("Positive") ? "bull" :
    data.rate_sensitivity.includes("Negative") ? "bear" : "neutral";

  return (
    <DeskAgentSection agentNumber={4} agentLabel="Macro & Geopolitical Agent"
      title="Sector Headwinds & Tailwinds" subtitle={`Horizon: ${data.horizon} · rates · regulation · geopolitics`}
      badge={<DeskSignalBadge signal={rateSig} label={`Rate: ${data.rate_sensitivity}`} />}>
      <div className="mb-5 rounded-lg border border-border bg-muted p-4">
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
    </DeskAgentSection>
  );
}

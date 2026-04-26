import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  agentLabel: string;
  agentNumber: number;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AgentSection({ agentLabel, agentNumber, title, subtitle, badge, children, className }: Props) {
  return (
    <section className={cn("rounded-lg border border-border bg-card shadow-card", className)}>
      {/* Header bar */}
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-hero font-mono text-xs font-bold text-primary-foreground">
            {agentNumber}
          </div>
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{agentLabel}</p>
            <h2 className="font-display text-lg font-semibold text-foreground leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 font-sans text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {badge && <div className="shrink-0 pt-1">{badge}</div>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

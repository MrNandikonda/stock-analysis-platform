import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  agentLabel: string;
  agentNumber: number;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DeskAgentSection({ agentLabel, agentNumber, title, subtitle, icon, badge, children, className }: Props) {
  return (
    <section className={cn("beacon-card animate-fade-in overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 bg-gradient-hero">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 font-mono text-xs font-bold text-white">
            {icon ?? agentNumber}
          </div>
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-white/50">{agentLabel}</p>
            <h2 className="font-display text-lg font-semibold text-white leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 font-sans text-xs text-white/50">{subtitle}</p>}
          </div>
        </div>
        {badge && <div className="shrink-0 pt-1">{badge}</div>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

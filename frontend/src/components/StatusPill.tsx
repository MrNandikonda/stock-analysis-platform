import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "fail" | "info" | "ai";

const toneClasses: Record<Tone, string> = {
  ok: "border-bull/30 bg-bull/10 text-bull",
  warn: "border-primary/30 bg-primary/10 text-primary",
  fail: "border-bear/30 bg-bear/10 text-bear",
  info: "border-border-strong bg-muted text-muted-foreground",
  ai: "border-secondary/30 bg-secondary/10 text-secondary",
};

export function StatusPill({
  tone = "info",
  pulse = false,
  icon,
  children,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("pill", toneClasses[tone], className)}>
      {pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-pulse-dot rounded-full opacity-60",
              tone === "ok" ? "bg-bull" : tone === "fail" ? "bg-bear" : tone === "ai" ? "bg-secondary" : "bg-primary",
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              tone === "ok" ? "bg-bull" : tone === "fail" ? "bg-bear" : tone === "ai" ? "bg-secondary" : "bg-primary",
            )}
          />
        </span>
      ) : null}
      {icon}
      {children}
    </span>
  );
}

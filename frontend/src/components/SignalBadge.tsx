import { cn } from "@/lib/utils";

export type Signal = "strong-bull" | "bull" | "neutral" | "bear" | "strong-bear";

const signalMap: Record<Signal, { label: string; className: string }> = {
  "strong-bull": { label: "Strong Bull", className: "border-bull/30 bg-bull/15 text-bull" },
  bull: { label: "Bull", className: "border-bull/25 bg-bull/10 text-bull" },
  neutral: { label: "Neutral", className: "border-border-strong bg-muted text-muted-foreground" },
  bear: { label: "Bear", className: "border-bear/25 bg-bear/10 text-bear" },
  "strong-bear": { label: "Strong Bear", className: "border-bear/30 bg-bear/15 text-bear" },
};

export function SignalBadge({ signal, className }: { signal: Signal; className?: string }) {
  const mapped = signalMap[signal];
  return (
    <span className={cn("pill", mapped.className, className)}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          signal.includes("bull") ? "bg-bull" : signal.includes("bear") ? "bg-bear" : "bg-muted-foreground",
        )}
      />
      {mapped.label}
    </span>
  );
}

export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const tone = value >= 75 ? "bg-bull" : value >= 50 ? "bg-primary" : "bg-bear";
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-xs tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

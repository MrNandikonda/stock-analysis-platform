import { deskRiskSignal } from "@/lib/desk-utils";

interface Props { score: number; }

export function DeskRiskMeter({ score }: Props) {
  const signal = deskRiskSignal(score);
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  const fillClass = signal === "bull" ? "bg-bull" : signal === "warn" ? "bg-warn" : "bg-bear";
  const textColor =
    signal === "bull" ? "text-bull" :
    signal === "warn" ? "text-warn" :
    "text-bear";
  const label = score <= 3.5 ? "Low" : score <= 6.5 ? "Medium" : "High";

  return (
    <div className="w-full space-y-2" aria-label={`Risk score ${score} of 10`}>
      <div className="flex items-baseline justify-between">
        <span className="font-sans text-xs uppercase tracking-widest text-muted-foreground">Risk Score</span>
        <span className="font-mono text-2xl font-semibold text-foreground">
          {score.toFixed(1)} <span className="text-sm text-muted-foreground">/ 10</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`${fillClass} h-full transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between font-sans text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>Conservative</span>
        <span className={`font-semibold ${textColor}`}>{label}</span>
        <span>Speculative</span>
      </div>
    </div>
  );
}

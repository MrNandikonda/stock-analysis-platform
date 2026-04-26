import { deskRiskSignal } from "@/lib/desk-utils";

interface Props { score: number; }

export function DeskRiskMeter({ score }: Props) {
  const signal = deskRiskSignal(score);
  const pct = (score / 10) * 100;
  const R = 54, cx = 64, cy = 68;
  const startAngle = -200, endAngle = 20;
  const totalAngle = endAngle - startAngle;
  const valueAngle = startAngle + (pct / 100) * totalAngle;

  function pt(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }
  function arc(a1: number, a2: number) {
    const s = pt(a1), e = pt(a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const strokeColor =
    signal === "bull" ? "hsl(var(--bull))" :
    signal === "warn" ? "hsl(var(--warn))" :
    "hsl(var(--bear))";
  const textColor =
    signal === "bull" ? "text-bull" :
    signal === "warn" ? "text-warn" :
    "text-bear";
  const label = score <= 3 ? "Low Risk" : score <= 6 ? "Moderate" : "High Risk";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 128 80" className="w-40" aria-label={`Risk score ${score} of 10`}>
        <path d={arc(startAngle, endAngle)} fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round" />
        <path d={arc(startAngle, valueAngle)} fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="JetBrains Mono, monospace"
          fontSize="22" fontWeight="700" fill="hsl(var(--foreground))">{score.toFixed(1)}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="Inter, sans-serif"
          fontSize="9" fill="hsl(var(--muted-foreground))">/10</text>
      </svg>
      <span className={`font-sans text-xs font-semibold uppercase tracking-widest ${textColor}`}>{label}</span>
    </div>
  );
}

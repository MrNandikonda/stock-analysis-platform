import { riskToSignal } from "@/lib/utils";
import { signalToColors } from "@/lib/utils";

interface Props { score: number; }

export function RiskMeter({ score }: Props) {
  const signal = riskToSignal(score);
  const { text } = signalToColors(signal);
  const pct = (score / 10) * 100;

  // Arc SVG gauge
  const R = 54;
  const cx = 64, cy = 68;
  const startAngle = -200;
  const endAngle = 20;
  const totalAngle = endAngle - startAngle;
  const valueAngle = startAngle + (pct / 100) * totalAngle;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }

  function arcPath(aStart: number, aEnd: number) {
    const s = polarToCartesian(aStart);
    const e = polarToCartesian(aEnd);
    const large = aEnd - aStart > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const trackPath = arcPath(startAngle, endAngle);
  const valuePath = arcPath(startAngle, valueAngle);

  const labelText = score <= 3 ? "Low Risk" : score <= 6 ? "Moderate" : "High Risk";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 128 80" className="w-40" aria-label={`Risk score ${score} of 10`}>
        {/* Track */}
        <path d={trackPath} fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round" />
        {/* Value arc */}
        <path
          d={valuePath} fill="none"
          stroke={score <= 3 ? "hsl(var(--bull))" : score <= 6 ? "hsl(var(--warn))" : "hsl(var(--bear))"}
          strokeWidth="10" strokeLinecap="round"
        />
        {/* Score text */}
        <text x={cx} y={cy + 4} textAnchor="middle" className="font-mono font-bold"
          fontSize="22" fill="hsl(var(--foreground))">{score.toFixed(1)}</text>
        <text x={cx} y={cy + 18} textAnchor="middle"
          fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="Inter">/ 10</text>
      </svg>
      <span className={`font-sans text-xs font-semibold uppercase tracking-widest ${text}`}>{labelText}</span>
    </div>
  );
}

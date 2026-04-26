import { cn, signalToColors } from "@/lib/utils";
import type { Signal } from "@/lib/types";

const LABELS: Record<Signal, string> = {
  bull: "Bullish", bear: "Bearish", warn: "Caution", info: "Info", neutral: "Neutral",
};

interface Props {
  signal: Signal;
  label?: string;
  size?: "sm" | "md";
  dot?: boolean;
}

export function SignalBadge({ signal, label, size = "md", dot = true }: Props) {
  const { bg, text, border } = signalToColors(signal);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-sans font-semibold uppercase tracking-wide",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      bg, text, border
    )}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", `bg-current`)} />}
      {label ?? LABELS[signal]}
    </span>
  );
}

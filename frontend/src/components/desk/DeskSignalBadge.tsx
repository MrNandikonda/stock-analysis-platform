import { deskSeverityColors, deskSignalColors } from "@/lib/desk-utils";
import { cn } from "@/lib/utils";
import type { DeskSeverity, DeskSignal } from "@/lib/desk-types";

const LABELS: Record<DeskSignal, string> = {
  bull: "Bullish", bear: "Bearish", warn: "Caution", info: "Info", neutral: "Neutral",
};

interface Props {
  signal?: DeskSignal;
  severity?: DeskSeverity;
  label?: string;
  size?: "sm" | "md";
  dot?: boolean;
}

export function DeskSignalBadge({ signal = "neutral", severity, label, size = "md", dot = true }: Props) {
  const { bg, text, border } = severity ? deskSeverityColors(severity) : deskSignalColors(signal);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-sans font-semibold uppercase tracking-wide",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      bg, text, border,
    )}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label ?? (severity ? severity : LABELS[signal])}
    </span>
  );
}

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export function Delta({ value, suffix = "%", className }: { value: number; suffix?: string; className?: string }) {
  const tone = value > 0 ? "text-bull" : value < 0 ? "text-bear" : "text-muted-foreground";
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;

  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono tabular-nums", tone, className)}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}

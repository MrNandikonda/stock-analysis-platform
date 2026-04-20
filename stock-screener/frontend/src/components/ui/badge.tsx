import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "positive" | "negative";
};

export const Badge = ({ className, tone = "neutral", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
      tone === "neutral" && "bg-slate-500/20 text-slate-200",
      tone === "positive" && "bg-mint/20 text-mint",
      tone === "negative" && "bg-red-500/20 text-red-300",
      className,
    )}
    {...props}
  />
);


import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "positive" | "negative";
};

export const Badge = ({ className, tone = "neutral", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
      tone === "neutral" && "border border-border-strong bg-muted text-muted-foreground",
      tone === "positive" && "border border-bull/25 bg-bull/10 text-bull",
      tone === "negative" && "border border-bear/25 bg-bear/10 text-bear",
      className,
    )}
    {...props}
  />
);

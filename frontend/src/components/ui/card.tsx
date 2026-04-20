import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("panel rounded-2xl p-4 shadow-panel", className)} {...props} />
);


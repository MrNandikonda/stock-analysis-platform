import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none ring-ring focus:border-ring focus:ring",
      className,
    )}
    {...props}
  >
    {children}
  </select>
);

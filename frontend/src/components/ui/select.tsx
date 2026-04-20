import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "w-full rounded-lg border border-slate-500/40 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-sunrise/60 focus:ring",
      className,
    )}
    {...props}
  >
    {children}
  </select>
);


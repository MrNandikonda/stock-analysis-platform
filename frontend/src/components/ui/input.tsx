import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "w-full rounded-lg border border-slate-500/40 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-sunrise/60 placeholder:text-slate-400 focus:ring",
      className,
    )}
    {...props}
  />
);


import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none ring-ring placeholder:text-muted-foreground/60 focus:border-ring focus:ring",
      className,
    )}
    {...props}
  />
);

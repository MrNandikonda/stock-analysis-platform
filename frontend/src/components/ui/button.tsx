import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export const Button = ({ className, variant = "default", ...props }: ButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
      variant === "default" && "bg-sunrise text-white hover:brightness-110",
      variant === "outline" && "border border-slate-400/40 bg-slate-900/40 text-slate-100 hover:border-slate-300",
      variant === "ghost" && "text-slate-100 hover:bg-slate-700/30",
      className,
    )}
    {...props}
  />
);


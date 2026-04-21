import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export const Button = ({ className, variant = "default", ...props }: ButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      variant === "default" &&
        "bg-primary text-primary-foreground shadow-amber hover:bg-primary-glow",
      variant === "outline" &&
        "border border-border bg-card/40 text-foreground hover:border-border-strong hover:bg-muted/60",
      variant === "ghost" && "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      className,
    )}
    {...props}
  />
);

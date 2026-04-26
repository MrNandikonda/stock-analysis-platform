import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Signal } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(v: number | null | undefined, decimals = 2, suffix = ""): string {
  if (v == null) return "—";
  return `${v.toFixed(decimals)}${suffix}`;
}

export function fmtPct(v: number | null | undefined, multiply = true): string {
  if (v == null) return "—";
  const val = multiply ? v * 100 : v;
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

export function fmtPrice(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtBn(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toFixed(1)}B`;
}

export function signalToColors(signal: Signal): { bg: string; text: string; border: string } {
  switch (signal) {
    case "bull":    return { bg: "bg-bull-soft",  text: "text-bull",  border: "border-bull/20" };
    case "bear":    return { bg: "bg-bear-soft",  text: "text-bear",  border: "border-bear/20" };
    case "warn":    return { bg: "bg-warn-soft",  text: "text-warn",  border: "border-warn/20" };
    case "info":    return { bg: "bg-info-soft",  text: "text-info",  border: "border-info/20" };
    default:        return { bg: "bg-muted",       text: "text-muted-foreground", border: "border-border" };
  }
}

export function riskToSignal(score: number): Signal {
  if (score <= 3) return "bull";
  if (score <= 6) return "warn";
  return "bear";
}

export function changeToSignal(change: number): Signal {
  if (change > 0) return "bull";
  if (change < 0) return "bear";
  return "neutral";
}

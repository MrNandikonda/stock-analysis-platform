import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DeskSeverity, DeskSignal } from "@/lib/desk-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function deskSignalColors(signal: DeskSignal) {
  switch (signal) {
    case "bull":    return { bg: "bg-bull-soft",  text: "text-bull",  border: "border-bull/20" };
    case "bear":    return { bg: "bg-bear-soft",  text: "text-bear",  border: "border-bear/20" };
    case "warn":    return { bg: "bg-warn-soft",  text: "text-warn",  border: "border-warn/20" };
    case "info":    return { bg: "bg-info-soft",  text: "text-info",  border: "border-info/20" };
    default:        return { bg: "bg-muted",       text: "text-muted-foreground", border: "border-border" };
  }
}

export function deskSeverityColors(severity: DeskSeverity) {
  switch (severity) {
    case "high": return { bg: "bg-bear-soft", text: "text-bear", border: "border-bear/30" };
    case "medium": return { bg: "bg-warn-soft", text: "text-warn", border: "border-warn/30" };
    case "low": return { bg: "bg-info-soft", text: "text-info", border: "border-info/30" };
    case "positive": return { bg: "bg-bull-soft", text: "text-bull", border: "border-bull/30" };
  }
}

export function deskRiskSignal(score: number): DeskSignal {
  if (score <= 3) return "bull";
  if (score <= 6) return "warn";
  return "bear";
}

export function deskFmt(v: number | null | undefined, decimals = 2, suffix = ""): string {
  if (v == null) return "—";
  return `${v.toFixed(decimals)}${suffix}`;
}

export function deskPct(v: number | null | undefined, multiply = true): string {
  if (v == null) return "—";
  const val = multiply ? v * 100 : v;
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

export function deskPrice(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function deskPriceForExchange(v: number | null | undefined, exchange?: string | null): string {
  if (v == null) return "—";
  const currency = exchange === "NSE" ? "INR" : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

export function deskCompact(v: number | null | undefined): string {
  if (v == null) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

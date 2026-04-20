import type { ReactElement, ReactNode } from "react";
import { ActivitySquare, ArrowLeftRight, ChartCandlestick, LayoutDashboard, ListFilter, Newspaper, Wallet, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export type AppTab = "dashboard" | "screener" | "charts" | "watchlists" | "portfolio" | "news" | "diagnostics";

const TAB_CONFIG: Array<{ id: AppTab; label: string; icon: ReactElement }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: "screener", label: "Screener", icon: <ListFilter size={16} /> },
  { id: "charts", label: "Charts", icon: <ChartCandlestick size={16} /> },
  { id: "watchlists", label: "Watchlists", icon: <Waves size={16} /> },
  { id: "portfolio", label: "Portfolio", icon: <Wallet size={16} /> },
  { id: "news", label: "News", icon: <Newspaper size={16} /> },
  { id: "diagnostics", label: "AI Ops", icon: <ActivitySquare size={16} /> },
];

type AppShellProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
};

export const AppShell = ({ activeTab, onTabChange, children }: AppShellProps) => {
  const { market, setMarket, currency, setCurrency } = useAppStore();

  return (
    <div className="min-h-screen bg-mesh-gradient px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <header className="mx-auto mb-6 flex w-full max-w-7xl flex-col gap-4 rounded-2xl border border-slate-500/25 bg-slate-950/45 p-5 shadow-panel backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Lightweight Multi-Market Screener
            </h1>
            <p className="muted text-sm">NSE + NYSE/NASDAQ | Delivery, F&O, ETFs, Indices</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-slate-500/35 bg-slate-900/55 p-1">
              {(["ALL", "NSE", "US"] as const).map((value) => (
                <Button
                  key={value}
                  variant={market === value ? "default" : "ghost"}
                  className="px-3 py-1.5 text-xs"
                  onClick={() => setMarket(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              className="gap-2 text-xs"
              onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
            >
              <ArrowLeftRight size={14} />
              {currency}
            </Button>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {TAB_CONFIG.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              className="justify-start gap-2 px-3 py-2 text-xs sm:text-sm"
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl">{children}</main>
    </div>
  );
};

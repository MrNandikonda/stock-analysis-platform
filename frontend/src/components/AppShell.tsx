import type { ReactElement, ReactNode } from "react";
import {
  ActivitySquare,
  ArrowLeftRight,
  ChartCandlestick,
  Cloud,
  Cpu,
  Database,
  LayoutDashboard,
  ListFilter,
  Menu,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Wallet,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/StatusPill";
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
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-amber shadow-amber">
              <span className="font-mono text-sm font-bold text-primary-foreground">R</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-bull ring-2 ring-sidebar" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-none tracking-tight text-foreground">RythuMarket</div>
              <div className="label-eyebrow mt-1">Intelligence Desk</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="label-eyebrow px-2 pb-2">Navigation</div>
          {TAB_CONFIG.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {active ? <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-r bg-primary glow-amber" /> : null}
                <span className={active ? "text-primary" : "text-sidebar-foreground"}>{tab.icon}</span>
                <span className={active ? "font-medium" : ""}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>Build</span>
            <span className="text-sidebar-foreground">v0.4.2</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>Host</span>
            <span className="text-sidebar-foreground">app.rythumarket.shop</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 h-auto border-b border-border bg-background/85 backdrop-blur-md lg:h-14">
          <div className="flex h-full flex-wrap items-center gap-3 px-3 py-3 md:px-5 lg:py-0">
            <div className="flex items-center gap-2 lg:hidden">
              <Menu className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">RythuMarket</span>
            </div>
            <div className="hidden max-w-md flex-1 items-center gap-2 md:flex">
              <div className="relative w-full">
                <Sparkles className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search symbol, watchlist, news..."
                  className="h-8 w-full rounded-md border border-border bg-input pl-8 pr-12 font-mono text-sm placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
                  Ctrl K
                </kbd>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5">
                {(["ALL", "NSE", "US"] as const).map((value) => (
                  <button
                    key={value}
                    className={`h-7 rounded px-3 font-mono text-xs uppercase tracking-wider transition ${
                      market === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setMarket(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="h-8 gap-2 rounded-md px-3 font-mono text-xs" onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}>
                <ArrowLeftRight size={13} />
                {currency}
              </Button>
              <div className="hidden items-center gap-2 xl:flex">
                <StatusPill tone="ok" pulse icon={<Cloud className="h-3 w-3" />}>Tunnel</StatusPill>
                <StatusPill tone="ai" icon={<Sparkles className="h-3 w-3" />}>AI Ready</StatusPill>
                <StatusPill tone="info" icon={<Database className="h-3 w-3" />}>SQLite</StatusPill>
                <StatusPill tone="info" icon={<Cpu className="h-3 w-3" />}>Self-hosted</StatusPill>
                <StatusPill tone="warn" icon={<ShieldCheck className="h-3 w-3" />}>Safety</StatusPill>
              </div>
              <div className="border-l border-border pl-3 font-mono text-xs tabular-nums text-muted-foreground">
                {time} <span className="text-foreground/60">LOCAL</span>
              </div>
            </div>
            <nav className="grid w-full grid-cols-4 gap-2 lg:hidden">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-[11px] ${
                    activeTab === tab.id ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card/40 text-muted-foreground"
                  }`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

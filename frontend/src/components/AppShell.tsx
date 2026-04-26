import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActivitySquare,
  ArrowLeftRight,
  ChartCandlestick,
  LayoutDashboard,
  ListFilter,
  Menu,
  Newspaper,
  Search,
  Sparkles,
  Wallet,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
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
  const { market, setMarket, currency, setCurrency, setSelectedSymbol } = useAppStore();
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const aiStatusQuery = useQuery({
    queryKey: ["ai-status-header"],
    queryFn: api.getAIStatus,
    staleTime: 120_000,
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      api
        .searchMarket(searchQuery)
        .then((res) => {
          setSearchResults(res.items.slice(0, 8));
          setSearchOpen(res.items.length > 0);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchOpen(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSelect = (result: SearchResult) => {
    setSelectedSymbol(result.symbol);
    onTabChange("charts");
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-black/5 bg-white/70 backdrop-blur-2xl text-sidebar-foreground lg:flex lg:flex-col shadow-2xl">
        <div className="border-b border-black/5 px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-premium-glow">
              <span className="font-display text-lg font-bold text-white">R</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-bold tracking-tight text-slate-900">RythuMarket</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-violet-600/80 mt-0.5">Intelligence Desk</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest px-2 pb-3 text-slate-500">Navigation</div>
          {TAB_CONFIG.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                  active
                    ? "bg-black/5 text-slate-900 shadow-inner"
                    : "text-slate-500 hover:bg-black/5 hover:text-slate-900"
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {active ? <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.6)]" /> : null}
                <span className={active ? "text-violet-600" : "text-slate-500 group-hover:text-slate-700 transition-colors"}>{tab.icon}</span>
                <span className={active ? "font-semibold tracking-wide" : "font-medium tracking-wide"}>{tab.label}</span>
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

      <div className="flex min-w-0 flex-1 flex-col relative z-0">
        <header className="sticky top-0 z-30 h-auto border-b border-black/5 bg-white/70 backdrop-blur-xl lg:h-16">
          <div className="flex h-full flex-wrap items-center gap-4 px-4 py-3 md:px-6 lg:py-0">
            <div className="flex items-center gap-2 lg:hidden">
              <Menu className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">RythuMarket</span>
            </div>
            <div className="hidden max-w-md flex-1 items-center gap-2 md:flex">
              <div className="relative w-full" ref={searchRef}>
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                  }}
                  placeholder="Search symbol..."
                  className="h-8 w-full rounded-md border border-border bg-input pl-8 pr-12 font-mono text-sm placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
                  Ctrl K
                </kbd>
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                    {searchResults.map((result) => (
                      <button
                        key={result.symbol}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-sidebar-accent/60"
                        onClick={() => handleSearchSelect(result)}
                      >
                        <span className="font-mono font-semibold text-foreground">{result.symbol}</span>
                        <span className="text-xs text-muted-foreground">{result.exchange} · {result.asset_type}</span>
                      </button>
                    ))}
                  </div>
                )}
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
                <StatusPill tone={aiStatusQuery.data?.ai_analysis_enabled ? "ai" : "warn"} icon={<Sparkles className="h-3 w-3" />}>
                  {aiStatusQuery.data?.ai_analysis_enabled ? "AI Ready" : "AI Off"}
                </StatusPill>
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

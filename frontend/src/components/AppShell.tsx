import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Menu,
  Newspaper,
  Search,
  Wallet,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export type AppTab = "dashboard" | "watchlists" | "portfolio" | "news";

const TAB_CONFIG: Array<{ id: AppTab; label: string; icon: ReactElement }> = [
  { id: "dashboard",   label: "Dashboard",   icon: <LayoutDashboard size={16} /> },
  { id: "watchlists",  label: "Watchlists",  icon: <Waves size={16} /> },
  { id: "portfolio",   label: "Portfolio",   icon: <Wallet size={16} /> },
  { id: "news",        label: "News",        icon: <Newspaper size={16} /> },
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hostLabel = typeof window !== "undefined" ? window.location.host : "local";

  useEffect(() => {
    const query = searchQuery.trim();
    setActiveResultIndex(0);
    if (!query) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(() => {
      api
        .searchMarket(query)
        .then((res) => {
          if (cancelled) return;
          setSearchResults(res.items.slice(0, 8));
          setSearchOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          setSearchResults([]);
          setSearchOpen(true);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSearchSelect = (result: SearchResult) => {
    setSelectedSymbol(result.symbol);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
      return;
    }
    if (!searchResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveResultIndex((index) => (index + 1) % searchResults.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveResultIndex((index) => (index - 1 + searchResults.length) % searchResults.length);
      return;
    }
    if (event.key === "Enter" && searchOpen) {
      event.preventDefault();
      handleSearchSelect(searchResults[activeResultIndex]);
    }
  };

  const showSearchMenu = searchOpen && Boolean(searchQuery.trim());

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-primary/15 bg-white/85 backdrop-blur-2xl text-sidebar-foreground lg:flex lg:flex-col shadow-2xl shadow-violet-500/10">
        <div className="border-b border-primary/10 bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-premium-glow">
              <span className="font-display text-lg font-bold text-white">R</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
            </div>
            <div className="min-w-0">
              <div className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 bg-clip-text font-display text-lg font-bold tracking-tight text-transparent">RythuMarket</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-violet-600 mt-0.5">Market Hub</div>
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
                    ? "bg-gradient-to-r from-violet-600/15 via-fuchsia-500/10 to-cyan-500/15 text-slate-950 shadow-inner ring-1 ring-violet-500/15"
                    : "text-slate-500 hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-cyan-500/10 hover:text-slate-900"
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {active ? <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500 shadow-[0_0_14px_rgba(139,92,246,0.7)]" /> : null}
                <span className={active ? "text-violet-600" : "text-slate-500 group-hover:text-violet-600 transition-colors"}>{tab.icon}</span>
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
            <span className="max-w-32 truncate text-sidebar-foreground" title={hostLabel}>{hostLabel}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col relative z-0">
        <header className="sticky top-0 z-30 h-auto border-b border-primary/10 bg-white/80 backdrop-blur-xl lg:h-16 shadow-sm shadow-violet-500/5">
          <div className="flex h-full flex-wrap items-center gap-4 px-4 py-3 md:px-6 lg:py-0">
            <div className="flex items-center gap-2 lg:hidden">
              <Menu className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">RythuMarket</span>
            </div>
            <div className="hidden max-w-md flex-1 items-center gap-2 md:flex">
              <div className="relative w-full" ref={searchRef}>
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search symbol..."
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSearchMenu}
                  aria-controls="symbol-search-results"
                  aria-activedescendant={showSearchMenu && searchResults[activeResultIndex] ? `symbol-search-${searchResults[activeResultIndex].exchange}-${searchResults[activeResultIndex].symbol}` : undefined}
                  className="h-8 w-full rounded-md border border-violet-200/80 bg-white/90 pl-8 pr-12 font-mono text-sm shadow-sm shadow-violet-500/5 placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
                  Ctrl K
                </kbd>
                {showSearchMenu && (
                  <div id="symbol-search-results" role="listbox" className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-violet-200 bg-background shadow-lg shadow-violet-500/10">
                    {searchLoading ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Searching market symbols…</div>
                    ) : null}
                    {!searchLoading && searchResults.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No matching symbols found.</div>
                    ) : null}
                    {searchResults.map((result) => (
                      <button
                        key={result.symbol}
                        id={`symbol-search-${result.exchange}-${result.symbol}`}
                        role="option"
                        aria-selected={searchResults[activeResultIndex]?.symbol === result.symbol}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm ${searchResults[activeResultIndex]?.symbol === result.symbol ? "bg-gradient-to-r from-violet-50 to-cyan-50" : "hover:bg-sidebar-accent/60"}`}
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
              <div className="flex items-center gap-1 rounded-md border border-violet-200 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-cyan-50 p-0.5 shadow-sm">
                {(["ALL", "NSE", "US"] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={market === value}
                    className={`h-7 rounded px-3 font-mono text-xs uppercase tracking-wider transition ${
                      market === value ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25" : "text-muted-foreground hover:text-violet-700"
                    }`}
                    onClick={() => setMarket(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="h-8 gap-2 rounded-md px-3 font-mono text-xs" title="Toggle display currency preference" onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}>
                <ArrowLeftRight size={13} />
                {currency}
              </Button>
              <div className="border-l border-border pl-3 font-mono text-xs tabular-nums text-muted-foreground">
                {time} <span className="text-foreground/60">LOCAL</span>
              </div>
            </div>
            <nav className="flex w-full gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Primary navigation">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  aria-label={`Open ${tab.label}`}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={`flex min-h-11 min-w-[5.25rem] items-center justify-center gap-1 rounded-md border px-2 py-2 text-[11px] ${
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

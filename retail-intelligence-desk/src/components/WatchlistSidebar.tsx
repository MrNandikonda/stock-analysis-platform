import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { SignalBadge } from "@/components/SignalBadge";
import { cn, fmtPrice, changeToSignal } from "@/lib/utils";

interface Props {
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}

export function WatchlistSidebar({ selectedSymbol, onSelect }: Props) {
  const { data: watchlist, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["watchlist"],
    queryFn: api.getWatchlist,
    refetchInterval: api.POLL_MS,
  });

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card">
      {/* Sidebar header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Paper Portfolio</p>
            <h2 className="font-display text-base font-semibold text-foreground">Watchlist</h2>
          </div>
          <button
            onClick={() => void refetch()}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw size={13} className={cn(isFetching && "animate-spin")} />
          </button>
        </div>
        <p className="mt-1.5 font-sans text-[11px] text-muted-foreground">
          Polls every 5 min · {watchlist?.length ?? 0} positions
        </p>
      </div>

      {/* Ticker list */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {isLoading && (
          <div className="space-y-2 px-3 py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        )}
        {watchlist?.map((ticker) => {
          const active = ticker.symbol === selectedSymbol;
          const cSig = changeToSignal(ticker.change1d);
          return (
            <button
              key={ticker.symbol}
              onClick={() => onSelect(ticker.symbol)}
              className={cn(
                "group flex w-full items-center gap-3 px-4 py-3 text-left transition-all",
                active
                  ? "bg-primary/5 border-l-2 border-l-accent"
                  : "border-l-2 border-l-transparent hover:bg-muted/60"
              )}
            >
              {/* Ticker block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn(
                    "font-mono text-sm font-bold",
                    active ? "text-foreground" : "text-foreground/80"
                  )}>{ticker.symbol}</span>
                  <SignalBadge signal={ticker.signal} size="sm" dot={false} label={ticker.signal === "neutral" ? "—" : undefined} />
                </div>
                <p className="mt-0.5 truncate font-sans text-[11px] text-muted-foreground">{ticker.name}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-foreground">{fmtPrice(ticker.price)}</span>
                  <span className={cn(
                    "flex items-center gap-0.5 font-mono text-[11px] font-semibold",
                    cSig === "bull" ? "text-bull" : cSig === "bear" ? "text-bear" : "text-muted-foreground"
                  )}>
                    {cSig === "bull" ? <TrendingUp size={10} /> : cSig === "bear" ? <TrendingDown size={10} /> : <Minus size={10} />}
                    {ticker.change1d >= 0 ? "+" : ""}{ticker.change1d.toFixed(2)}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <p className="font-sans text-[10px] text-muted-foreground">
          Research support only · Not financial advice
        </p>
      </div>
    </aside>
  );
}

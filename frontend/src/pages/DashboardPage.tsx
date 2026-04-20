import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, DatabaseZap, Flame, Timer } from "lucide-react";

import { MarketStatusPanel } from "@/components/MarketStatusPanel";
import { QuotesTable } from "@/components/QuotesTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuoteStream } from "@/hooks/useQuoteStream";
import { api } from "@/lib/api";
import { formatCompact, formatNumber } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export const DashboardPage = () => {
  const { market, currency, setSelectedSymbol } = useAppStore();
  const { streamedQuotes, streamError } = useQuoteStream(market);

  const statusQuery = useQuery({
    queryKey: ["market-status"],
    queryFn: api.getMarketStatus,
    refetchInterval: 60_000,
  });

  const quotesQuery = useQuery({
    queryKey: ["quotes", market],
    queryFn: () => api.getQuotes(market, 1, 50),
    refetchInterval: 30_000,
  });

  const watchlistQuery = useQuery({
    queryKey: ["watchlists"],
    queryFn: api.getWatchlists,
    refetchInterval: 45_000,
  });
  const aiSummariesQuery = useQuery({
    queryKey: ["dashboard-ai-summaries", watchlistQuery.data?.map((item) => item.id).join(",") ?? "none"],
    enabled: Boolean(watchlistQuery.data?.length),
    queryFn: async () =>
      Promise.all(
        (watchlistQuery.data ?? []).map(async (watchlist) => {
          try {
            return await api.getAIWatchlistSummary(watchlist.id);
          } catch {
            return null;
          }
        }),
      ),
    refetchInterval: 60_000,
  });

  const activeRows = streamedQuotes?.length ? streamedQuotes : quotesQuery.data?.items ?? [];
  const topMovers = [...activeRows].sort((a, b) => (b.change_1d ?? 0) - (a.change_1d ?? 0)).slice(0, 5);
  const biggestVolumes = [...activeRows].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 5);

  return (
    <div className="space-y-5">
      <MarketStatusPanel status={statusQuery.data} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tracked Symbols"
          value={formatNumber(quotesQuery.data?.total ?? 0, 0)}
          subtitle="Across active market selection"
          icon={<DatabaseZap size={16} />}
        />
        <MetricCard
          title="Top 5 Avg Move"
          value={`${formatNumber(average(topMovers.map((item) => item.change_1d ?? 0)), 2)}%`}
          subtitle="Daily momentum pulse"
          icon={<Flame size={16} />}
        />
        <MetricCard
          title="Largest Volume"
          value={formatCompact(biggestVolumes[0]?.volume ?? 0)}
          subtitle={biggestVolumes[0]?.symbol ?? "N/A"}
          icon={<BarChart3 size={16} />}
        />
        <MetricCard
          title="Last Refresh"
          value={quotesQuery.dataUpdatedAt ? new Date(quotesQuery.dataUpdatedAt).toLocaleTimeString() : "--"}
          subtitle="Polling every 30 seconds"
          icon={<Timer size={16} />}
        />
      </section>

      {streamError ? (
        <Card className="flex items-center justify-between gap-2 border-amber-400/25 bg-amber-500/10 p-3">
          <span className="text-xs text-amber-100">{streamError}</span>
          <Badge tone="neutral">Fallback Active</Badge>
        </Card>
      ) : (
        <Card className="flex items-center justify-between gap-2 border-mint/25 bg-mint/10 p-3">
          <span className="text-xs text-mint">Live SSE stream active</span>
          <Badge tone="positive">Realtime</Badge>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-white">Unified Market Watch</h2>
            <p className="muted text-xs">Click symbol to jump into charting view.</p>
          </div>
          <Button variant="outline" onClick={() => void api.refreshMarketData(120)}>
            Manual Refresh
          </Button>
        </div>
        <QuotesTable rows={activeRows} currency={currency} onSymbolClick={setSelectedSymbol} />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg text-white">Watchlists</h2>
          <p className="muted text-xs">Unified view for NSE and US symbols.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(watchlistQuery.data ?? []).map((watchlist) => (
            <div key={watchlist.id} className="rounded-xl border border-slate-500/25 bg-slate-900/40 p-3">
              {aiSummariesQuery.data?.find((summary) => summary?.watchlist_id === watchlist.id) ? (
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone="neutral">
                    {
                      aiSummariesQuery.data.find((summary) => summary?.watchlist_id === watchlist.id)?.overall_sentiment ??
                      "no_data"
                    }
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    {aiSummariesQuery.data.find((summary) => summary?.watchlist_id === watchlist.id)?.provider_name ?? "-"}
                  </span>
                </div>
              ) : null}
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold text-slate-100">{watchlist.name}</h4>
                <Badge>{watchlist.items.length} symbols</Badge>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                {watchlist.items.slice(0, 4).map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between">
                    <button className="text-glacier hover:text-sky-300" onClick={() => setSelectedSymbol(item.symbol)}>
                      {item.symbol}
                    </button>
                    <span className={(item.change_1d ?? 0) >= 0 ? "positive" : "negative"}>
                      {formatNumber(item.change_1d, 2)}%
                    </span>
                  </div>
                ))}
              </div>
              {aiSummariesQuery.data?.find((summary) => summary?.watchlist_id === watchlist.id)?.top_bullish_names.length ? (
                <p className="mt-3 text-[11px] text-slate-400">
                  Bullish: {aiSummariesQuery.data.find((summary) => summary?.watchlist_id === watchlist.id)?.top_bullish_names.join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactElement;
}) => (
  <Card className="flex items-start justify-between">
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-300">{title}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
      <p className="muted text-xs">{subtitle}</p>
    </div>
    <div className="rounded-lg bg-slate-800/40 p-2 text-glacier">{icon}</div>
  </Card>
);

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

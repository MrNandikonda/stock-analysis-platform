import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, BrainCircuit, DatabaseZap, Flame, Radar, Timer } from "lucide-react";

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
  const summaries = aiSummariesQuery.data?.filter(Boolean) ?? [];
  const activeAISummaries = summaries.filter((summary) => summary?.enabled).length;

  return (
    <div className="space-y-5">
      <Card className="hero-glow grid gap-5 overflow-hidden p-5 md:grid-cols-[1.45fr_0.85fr]">
        <div className="relative">
          <Badge className="mb-4" tone="positive">
            Live public deployment
          </Badge>
          <h2 className="font-display text-2xl font-semibold text-white sm:text-4xl">
            Scan markets, explain moves, and keep watchlists alive.
          </h2>
          <p className="muted mt-3 max-w-2xl text-sm leading-6">
            Your dashboard blends quote polling, SSE updates, AI watchlist summaries, and cached fundamentals into a
            single cockpit that stays light enough for this laptop.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <HeroStat label="Market" value={market} />
            <HeroStat label="Currency" value={currency} />
            <HeroStat label="AI watchlists" value={`${activeAISummaries}/${watchlistQuery.data?.length ?? 0}`} />
          </div>
        </div>
        <div className="relative rounded-[1.35rem] border border-aqua/20 bg-slate-950/45 p-4">
          <div className="mb-4 flex items-center gap-2 text-aqua">
            <Radar size={18} />
            <span className="text-sm font-semibold">Signal radar</span>
          </div>
          <div className="space-y-3">
            {topMovers.slice(0, 4).map((item, index) => (
              <div key={item.symbol} className="rounded-2xl border border-slate-300/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-white">{item.symbol}</span>
                  <span className={(item.change_1d ?? 0) >= 0 ? "positive" : "negative"}>
                    {formatNumber(item.change_1d, 2)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-aqua to-amber-300"
                    style={{ width: `${Math.min(100, Math.max(12, 35 + Math.abs(item.change_1d ?? 0) * 8 + index * 5))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

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

      <Card className="space-y-4 hover:border-aqua/25">
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

      <Card className="space-y-4 hover:border-aqua/25">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg text-white">
            <BrainCircuit size={18} className="text-aqua" />
            AI watchlist deck
          </h2>
          <p className="muted text-xs">Unified view for NSE and US symbols.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(watchlistQuery.data ?? []).map((watchlist) => (
            <div key={watchlist.id} className="rounded-2xl border border-slate-300/15 bg-slate-950/35 p-3 transition hover:-translate-y-0.5 hover:border-aqua/30">
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
  <Card className="flex items-start justify-between hover:-translate-y-0.5 hover:border-aqua/25">
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-300">{title}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
      <p className="muted text-xs">{subtitle}</p>
    </div>
    <div className="rounded-2xl border border-aqua/15 bg-aqua/10 p-2 text-aqua">{icon}</div>
  </Card>
);

const HeroStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-300/15 bg-slate-950/40 p-3">
    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-1 font-display text-xl text-white">{value}</p>
  </div>
);

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

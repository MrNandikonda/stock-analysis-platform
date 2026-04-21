import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Newspaper } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export const NewsPage = () => {
  const [symbolFilter, setSymbolFilter] = useState("");

  const newsQuery = useQuery({
    queryKey: ["news", symbolFilter],
    queryFn: () => api.getNews(symbolFilter || undefined, 30),
    refetchInterval: 60_000,
  });
  const earningsQuery = useQuery({
    queryKey: ["earnings", symbolFilter],
    queryFn: () => api.getEarningsCalendar(symbolFilter || undefined),
    refetchInterval: 180_000,
  });

  const sentimentSummary = useMemo(() => {
    const entries = newsQuery.data ?? [];
    if (!entries.length) return { positive: 0, neutral: 0, negative: 0 };
    return entries.reduce(
      (acc, item) => {
        if (item.sentiment > 0.2) acc.positive += 1;
        else if (item.sentiment < -0.2) acc.negative += 1;
        else acc.neutral += 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 },
    );
  }, [newsQuery.data]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="News · Sentiment"
        title="Market narrative radar"
        subtitle="RSS aggregation, watchlist filtering, earnings events, and lightweight VADER sentiment scoring."
        actions={
          <>
            <StatusPill tone="ok">{newsQuery.data?.length ?? 0} headlines</StatusPill>
            <StatusPill tone="warn">{earningsQuery.data?.length ?? 0} events</StatusPill>
          </>
        }
      />

      <Card className="panel-elevated flex flex-wrap items-center justify-between gap-2">
        <Input className="w-full sm:w-80" value={symbolFilter} onChange={(event) => setSymbolFilter(event.target.value.toUpperCase())} placeholder="Filter by symbols (comma-separated)" />
      </Card>

      <section className="grid gap-3 sm:grid-cols-3">
        <SentimentCard label="Positive" value={sentimentSummary.positive} tone="positive" />
        <SentimentCard label="Neutral" value={sentimentSummary.neutral} tone="neutral" />
        <SentimentCard label="Negative" value={sentimentSummary.negative} tone="negative" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="panel-elevated space-y-4">
          <div className="flex items-center gap-2">
            <Newspaper size={16} className="text-glacier" />
            <h3 className="font-display text-base text-white">Latest Headlines</h3>
          </div>
          <div className="space-y-3">
            {(newsQuery.data ?? []).map((item) => (
              <article key={`${item.link}-${item.published}`} className="rounded-md border border-border bg-background-elevated/60 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <a href={item.link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-100 hover:text-glacier">
                    {item.title}
                  </a>
                  <Badge tone={item.sentiment > 0.2 ? "positive" : item.sentiment < -0.2 ? "negative" : "neutral"}>
                    {item.sentiment}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">{item.summary}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {item.source} | {item.published || "No timestamp"}
                </p>
              </article>
            ))}
          </div>
        </Card>

        <Card className="panel-elevated space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-sunrise" />
            <h3 className="font-display text-base text-white">Earnings Calendar</h3>
          </div>
          <div className="space-y-2">
            {(earningsQuery.data ?? []).map((event) => (
              <div key={`${event.symbol}-${event.earnings_date_utc}`} className="rounded-lg border border-slate-500/20 bg-slate-900/35 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">{event.symbol}</span>
                  <Badge tone="neutral">{event.market}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {new Date(event.earnings_date_utc).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
};

const SentimentCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "neutral" | "negative";
}) => (
  <Card className="flex items-center justify-between">
    <div>
      <p className="label-eyebrow">{label}</p>
      <p className="font-mono text-2xl text-foreground">{value}</p>
    </div>
    <Badge tone={tone}>{tone}</Badge>
  </Card>
);

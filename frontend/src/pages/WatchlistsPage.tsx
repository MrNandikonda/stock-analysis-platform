import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellPlus,
  BrainCircuit,
  CalendarClock,
  DatabaseZap,
  FileText,
  FileUp,
  LineChart,
  ListPlus,
  Play,
  PlusCircle,
  Save,
  Settings2,
  Smartphone,
  Trash2,
  Waves,
  X,
} from "lucide-react";

import { AnalystReportPanel } from "@/components/AnalystReportPanel";
import { PageHeader } from "@/components/PageHeader";
import { PositionEntryModal } from "@/components/PositionEntryModal";
import { StatusPill } from "@/components/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { AIAnalysisCategory, AIAnalysisListItem, AIWatchlistSettings, WatchlistItem } from "@/lib/types";
import { formatCompact, formatDateTime, formatNumber, formatRelativeMinutes } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const CATEGORY_OPTIONS: Array<{ value: AIAnalysisCategory; label: string }> = [
  { value: "news_intel", label: "News" },
  { value: "geopolitical_risk", label: "Geo Risk" },
  { value: "regulation", label: "Regulation" },
  { value: "fundamentals", label: "Fundamentals" },
  { value: "technicals", label: "Technicals" },
  { value: "earnings_events", label: "Events" },
  { value: "options_flow", label: "Options" },
  { value: "macro_sector", label: "Sector" },
  { value: "portfolio_impact", label: "Portfolio" },
  { value: "source_health", label: "Source Health" },
];

const defaultAISettings: AIWatchlistSettings = {
  enabled: false,
  cadence_minutes: 60,
  categories: ["news_intel", "fundamentals", "technicals", "earnings_events", "options_flow", "macro_sector", "portfolio_impact", "source_health"],
  provider_name: "local-summary",
  max_stocks_per_job: 15,
  max_parallel_agents: 2,
  stale_after_minutes: 180,
};

export const WatchlistsPage = () => {
  const queryClient = useQueryClient();
  const setSelectedSymbol = useAppStore((state) => state.setSelectedSymbol);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [selectedAnalysisSymbol, setSelectedAnalysisSymbol] = useState<string | null>(null);
  const [symbolsInput, setSymbolsInput] = useState("");
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertCondition, setAlertCondition] = useState("price_gt");
  const [alertTarget, setAlertTarget] = useState("0");
  const [csvText, setCsvText] = useState("symbol\nRELIANCE\nAAPL");
  const [aiForm, setAIForm] = useState<AIWatchlistSettings>(defaultAISettings);
  const [convertingSymbol, setConvertingSymbol] = useState<string | null>(null);
  const [reportSymbol, setReportSymbol] = useState<string | null>(null);

  const watchlistsQuery = useQuery({
    queryKey: ["watchlists"],
    queryFn: api.getWatchlists,
  });

  useEffect(() => {
    if (!watchlistsQuery.data?.length) {
      setSelectedWatchlistId(null);
      return;
    }
    if (!selectedWatchlistId || !watchlistsQuery.data.some((watchlist) => watchlist.id === selectedWatchlistId)) {
      setSelectedWatchlistId(watchlistsQuery.data[0].id);
    }
  }, [selectedWatchlistId, watchlistsQuery.data]);

  const selectedWatchlist = useMemo(
    () => watchlistsQuery.data?.find((watchlist) => watchlist.id === selectedWatchlistId) ?? null,
    [watchlistsQuery.data, selectedWatchlistId],
  );

  const aiStatusQuery = useQuery({
    queryKey: ["ai-status"],
    queryFn: api.getAIStatus,
    refetchInterval: 60_000,
  });

  const aiSettingsQuery = useQuery({
    queryKey: ["ai-watchlist-settings", selectedWatchlistId],
    enabled: Boolean(selectedWatchlistId),
    queryFn: () => api.getAIWatchlistSettings(selectedWatchlistId as number),
  });

  const aiSummaryQuery = useQuery({
    queryKey: ["ai-watchlist-summary", selectedWatchlistId],
    enabled: Boolean(selectedWatchlistId),
    queryFn: () => api.getAIWatchlistSummary(selectedWatchlistId as number),
    refetchInterval: 60_000,
  });

  const aiAnalysesQuery = useQuery({
    queryKey: ["ai-watchlist-analyses", selectedWatchlistId],
    enabled: Boolean(selectedWatchlistId),
    queryFn: () => api.getAIWatchlistAnalyses(selectedWatchlistId as number),
    refetchInterval: 60_000,
  });

  const analysisDetailQuery = useQuery({
    queryKey: ["ai-analysis-detail", selectedWatchlistId, selectedAnalysisSymbol],
    enabled: Boolean(selectedWatchlistId && selectedAnalysisSymbol),
    queryFn: () => api.getAIStockAnalysisDetail(selectedWatchlistId as number, selectedAnalysisSymbol as string),
  });

  useEffect(() => {
    if (aiSettingsQuery.data) {
      setAIForm(aiSettingsQuery.data);
    }
  }, [aiSettingsQuery.data]);

  useEffect(() => {
    const analyses = aiAnalysesQuery.data ?? [];
    if (!analyses.length) {
      setSelectedAnalysisSymbol(null);
      return;
    }
    if (!selectedAnalysisSymbol || !analyses.some((analysis) => analysis.symbol === selectedAnalysisSymbol)) {
      setSelectedAnalysisSymbol(analyses[0].symbol);
    }
  }, [selectedAnalysisSymbol, aiAnalysesQuery.data]);

  const createWatchlistMutation = useMutation({
    mutationFn: api.createWatchlist,
    onSuccess: () => {
      setNewWatchlistName("");
      void queryClient.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const addItemsMutation = useMutation({
    mutationFn: ({ watchlistId, symbols }: { watchlistId: number; symbols: string[] }) =>
      api.addWatchlistItems(watchlistId, symbols),
    onSuccess: () => {
      setSymbolsInput("");
      void queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-analyses"] });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: ({ symbol, condition, target }: { symbol: string; condition: string; target: number }) =>
      api.createAlert(symbol, condition, target),
    onSuccess: () => {
      setAlertSymbol("");
      setAlertTarget("");
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: ({ watchlistId, csvData }: { watchlistId: number; csvData: string }) =>
      api.importWatchlistCsv(watchlistId, csvData),
    onSuccess: () => {
      setCsvText("symbol\nRELIANCE\nAAPL");
      void queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-summary"] });
    },
  });

  const saveAISettingsMutation = useMutation({
    mutationFn: ({ watchlistId, payload }: { watchlistId: number; payload: AIWatchlistSettings }) =>
      api.updateAIWatchlistSettings(watchlistId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-settings", selectedWatchlistId] });
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-summary", selectedWatchlistId] });
    },
  });

  const runAIMutation = useMutation({
    mutationFn: ({ watchlistId, force }: { watchlistId: number; force: boolean }) => api.runAIWatchlistAnalysis(watchlistId, force),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-summary", selectedWatchlistId] });
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-analyses", selectedWatchlistId] });
      void queryClient.invalidateQueries({ queryKey: ["ai-diagnostics"] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ watchlistId, symbol }: { watchlistId: number; symbol: string }) =>
      api.removeWatchlistItem(watchlistId, symbol),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-summary", selectedWatchlistId] });
      void queryClient.invalidateQueries({ queryKey: ["ai-watchlist-analyses", selectedWatchlistId] });
    },
  });

  const deleteWatchlistMutation = useMutation({
    mutationFn: api.deleteWatchlist,
    onSuccess: () => {
      setSelectedWatchlistId(null);
      setSelectedAnalysisSymbol(null);
      void queryClient.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const items = selectedWatchlist?.items ?? [];
  const analyses = aiAnalysesQuery.data ?? aiSummaryQuery.data?.latest_analyses ?? [];
  const analysisMap = useMemo(() => new Map(analyses.map((analysis) => [analysis.symbol, analysis])), [analyses]);
  const bullishFactors = analysisDetailQuery.data?.analysis.factors.filter((item) => item.factor_type === "bullish") ?? [];
  const bearishFactors = analysisDetailQuery.data?.analysis.factors.filter((item) => item.factor_type === "bearish" || item.factor_type === "risk") ?? [];
  const neutralFactors = analysisDetailQuery.data?.analysis.factors.filter((item) => item.factor_type === "neutral" || item.factor_type === "stale") ?? [];
  const averageChange = items.length ? items.reduce((sum, item) => sum + (item.change_1d ?? 0), 0) / items.length : null;
  const staleItems = items.filter((item) => {
    const age = getAgeMinutes(item.updated_at);
    return age === null || age > 180;
  });
  const topConstructive = [...analyses].sort((a, b) => b.overall_score - a.overall_score).slice(0, 3);
  const topCautious = [...analyses].sort((a, b) => a.overall_score - b.overall_score).slice(0, 3);
  const providerNames = Array.from(
    new Set([aiForm.provider_name, ...(aiStatusQuery.data?.providers ?? []).map((provider) => provider.provider_name)].filter(Boolean)),
  );

  const addSymbols = () => {
    if (!selectedWatchlistId || !symbolsInput.trim()) return;
    const symbols = symbolsInput
      .split(/[\n,]/)
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);
    if (!symbols.length) return;
    addItemsMutation.mutate({ watchlistId: selectedWatchlistId, symbols });
  };

  const selectWatchlist = (id: number) => {
    setSelectedWatchlistId(id);
    setSelectedAnalysisSymbol(null);
  };

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      <PageHeader
        eyebrow="Watchlists · RythuMarket Data-Rich Watch Hub"
        title="RythuMarket Data-Rich Watch Hub"
        subtitle="A Robinhood-simple and Groww-inspired research surface for cached quotes, factors, alerts, portfolio tracking, and optional AI context. Research support only — not trading advice."
        actions={
          <>
            <StatusPill tone="info">{watchlistsQuery.data?.length ?? 0} lists</StatusPill>
            <StatusPill tone="info" icon={<Smartphone size={12} />}>Mobile-ready</StatusPill>
            <StatusPill tone={aiStatusQuery.data?.ai_analysis_enabled ? "ai" : "warn"}>
              {aiStatusQuery.data?.ai_analysis_enabled ? "AI Ready" : "AI Disabled"}
            </StatusPill>
          </>
        }
      />

      <Card className="panel-elevated hero-glow overflow-hidden p-0">
        <div className="relative z-10 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 p-4 text-white md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                <Waves size={14} /> RythuMarket watch hub
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
                {selectedWatchlist?.name ?? "Create your first focused market list"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                Data-rich cards use cached SQLite quote metrics, fundamentals, technical indicators, and latest AI summaries where available. Missing metrics stay visibly marked instead of being guessed.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[560px]">
              <HeroMetric label="Symbols" value={String(items.length)} />
              <HeroMetric label="Avg 1D" value={formatPercent(averageChange)} tone={changeTone(averageChange)} />
              <HeroMetric label="AI Score" value={formatNumber(aiSummaryQuery.data?.average_score, 2)} />
              <HeroMetric label="Stale / Missing" value={String(staleItems.length)} tone={staleItems.length ? "warn" : "ok"} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {(watchlistsQuery.data ?? []).map((watchlist) => (
                  <button
                    key={watchlist.id}
                    className={`rounded-full border px-4 py-2 text-left text-sm transition ${
                      watchlist.id === selectedWatchlistId
                        ? "border-white bg-white text-violet-700 shadow-lg shadow-violet-950/15"
                        : "border-white/25 bg-white/12 text-white hover:bg-white/20"
                    }`}
                    onClick={() => selectWatchlist(watchlist.id)}
                  >
                    <span className="font-semibold">{watchlist.name}</span>
                    <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 font-mono text-[11px]">{watchlist.items.length}</span>
                  </button>
                ))}
                {!watchlistsQuery.data?.length ? (
                  <span className="rounded-full border border-white/25 bg-white/12 px-4 py-2 text-sm text-white/85">No lists yet</span>
                ) : null}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                value={newWatchlistName}
                onChange={(event) => setNewWatchlistName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newWatchlistName.trim()) createWatchlistMutation.mutate(newWatchlistName.trim());
                }}
                placeholder="New list name"
                className="border-white/30 bg-white/95 text-slate-950 placeholder:text-slate-500"
              />
              <Button
                className="gap-2 bg-white text-violet-700 hover:bg-white/90"
                disabled={createWatchlistMutation.isPending || !newWatchlistName.trim()}
                onClick={() => {
                  if (!newWatchlistName.trim()) return;
                  createWatchlistMutation.mutate(newWatchlistName.trim());
                }}
              >
                <PlusCircle size={15} /> Create
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <div className="space-y-5">
          <Card className="panel-elevated space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="label-eyebrow">Symbol command bar</div>
                <h3 className="font-display text-xl font-semibold text-white">Add, compare, and track ideas</h3>
                <p className="muted mt-1 text-sm">Symbols are validated by the backend before insertion. Quote refresh happens through the existing market service.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!selectedWatchlist || deleteWatchlistMutation.isPending}
                  onClick={() => {
                    if (!selectedWatchlist) return;
                    if (!window.confirm(`Delete watchlist "${selectedWatchlist.name}"? This cannot be undone.`)) return;
                    deleteWatchlistMutation.mutate(selectedWatchlist.id);
                  }}
                >
                  <Trash2 size={15} /> Delete list
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!selectedWatchlistId || runAIMutation.isPending}
                  onClick={() => selectedWatchlistId && runAIMutation.mutate({ watchlistId: selectedWatchlistId, force: true })}
                >
                  <Play size={15} /> {runAIMutation.isPending ? "Running…" : "Run AI"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={symbolsInput}
                onChange={(event) => setSymbolsInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addSymbols();
                }}
                placeholder="Add symbols: RELIANCE, INFY, AAPL, SPY"
                disabled={!selectedWatchlistId}
              />
              <Button className="gap-2" disabled={!selectedWatchlistId || addItemsMutation.isPending || !symbolsInput.trim()} onClick={addSymbols}>
                <ListPlus size={16} /> {addItemsMutation.isPending ? "Adding…" : "Add symbols"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DataNote icon={<DatabaseZap size={16} />} title="Cached metrics" body="Price, change, volume, valuation, and technical fields come from stored metrics." />
              <DataNote icon={<BrainCircuit size={16} />} title="AI context" body="Optional watchlist analysis adds evidence, stale flags, and source health labels." />
              <DataNote icon={<Smartphone size={16} />} title="Mobile cards" body="Cards stack into thumb-friendly actions for phone and tablet use." />
            </div>
          </Card>

          {!selectedWatchlist ? (
            <EmptyWatchlistState onCreate={() => newWatchlistName.trim() && createWatchlistMutation.mutate(newWatchlistName.trim())} />
          ) : items.length ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {items.map((item) => (
                  <ResearchCard
                    key={item.symbol}
                    item={item}
                    analysis={analysisMap.get(item.symbol)}
                    onSelect={() => setSelectedSymbol(item.symbol)}
                    onOpenReport={() => setReportSymbol(item.symbol)}
                    onTrack={() => setConvertingSymbol(item.symbol)}
                    onAnalyze={() => setSelectedAnalysisSymbol(item.symbol)}
                    onAlert={() => setAlertSymbol(item.symbol)}
                    onRemove={() => removeItemMutation.mutate({ watchlistId: selectedWatchlist.id, symbol: item.symbol })}
                    removing={removeItemMutation.isPending}
                  />
                ))}
              </div>

              <Card className="panel-elevated hidden overflow-hidden p-0 lg:block">
                <div className="flex items-center justify-between border-b border-primary/15 px-4 py-3">
                  <div>
                    <div className="label-eyebrow">Desktop compare board</div>
                    <h3 className="font-display text-lg font-semibold text-white">Data-rich research table</h3>
                  </div>
                  <Badge tone="neutral">{items.length} cached rows</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-white/45 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">1D</th>
                        <th className="px-4 py-3">RSI</th>
                        <th className="px-4 py-3">Trend</th>
                        <th className="px-4 py-3">Valuation</th>
                        <th className="px-4 py-3">Options</th>
                        <th className="px-4 py-3">Freshness</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.symbol} className="data-row">
                          <td className="px-4 py-3">
                            <button className="text-left" onClick={() => setSelectedSymbol(item.symbol)}>
                              <div className="ticker text-foreground">{item.symbol}</div>
                              <div className="max-w-48 truncate text-xs text-muted-foreground">{item.name ?? item.sector ?? "Name unavailable"}</div>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono">{formatNumber(item.price, 2)}</td>
                          <td className={`px-4 py-3 font-mono ${changeClass(item.change_1d)}`}>{formatPercent(item.change_1d)}</td>
                          <td className="px-4 py-3">{formatNumber(item.rsi_14, 1)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{trendLabel(item)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">P/E {formatNumber(item.pe, 1)} · P/B {formatNumber(item.pb, 1)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">PCR {formatNumber(item.pcr, 2)} · IV {formatPercent(item.iv)}</td>
                          <td className="px-4 py-3"><FreshnessPill updatedAt={item.updated_at} /></td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <IconAction label="Report" onClick={() => setReportSymbol(item.symbol)}><FileText size={14} /></IconAction>
                              <IconAction label="Track" onClick={() => setConvertingSymbol(item.symbol)}><PlusCircle size={14} /></IconAction>
                              <IconAction label="Alert" onClick={() => setAlertSymbol(item.symbol)}><BellPlus size={14} /></IconAction>
                              <IconAction label="Remove" onClick={() => removeItemMutation.mutate({ watchlistId: selectedWatchlist.id, symbol: item.symbol })}><X size={14} /></IconAction>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="panel-elevated space-y-3 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ListPlus size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-white">This watchlist is ready for symbols</h3>
              <p className="muted mx-auto max-w-xl text-sm">Add comma-separated tickers above or import a CSV below. The backend validates unknown symbols and keeps invalid entries out.</p>
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <CsvImportPanel
              csvText={csvText}
              setCsvText={setCsvText}
              disabled={!selectedWatchlistId || importCsvMutation.isPending}
              onImport={() => selectedWatchlistId && importCsvMutation.mutate({ watchlistId: selectedWatchlistId, csvData: csvText })}
            />
            <AlertPanel
              alertSymbol={alertSymbol}
              setAlertSymbol={setAlertSymbol}
              alertCondition={alertCondition}
              setAlertCondition={setAlertCondition}
              alertTarget={alertTarget}
              setAlertTarget={setAlertTarget}
              createAlertMutation={createAlertMutation}
            />
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card className="panel-elevated space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label-eyebrow">Insight rail</div>
                <h3 className="font-display text-xl font-semibold text-white">AI research context</h3>
                <p className="muted mt-1 text-sm">Signals are screening context only. Use source freshness and confidence before acting.</p>
              </div>
              <Badge tone={aiSummaryQuery.data?.stale_data_warning ? "negative" : "neutral"}>
                {aiSummaryQuery.data?.overall_sentiment ?? "no_data"}
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <MiniStat label="Last run" value={formatDateTime(aiSummaryQuery.data?.last_run_time)} icon={<CalendarClock size={15} />} />
              <MiniStat label="Provider" value={aiSummaryQuery.data?.provider_name ?? aiForm.provider_name} icon={<BrainCircuit size={15} />} />
              <MiniStat label="Avg confidence" value={formatNumber(aiSummaryQuery.data?.average_confidence, 2)} icon={<LineChart size={15} />} />
              <MiniStat label="Next run" value={formatDateTime(aiSummaryQuery.data?.next_run_time)} icon={<CalendarClock size={15} />} />
            </div>

            {aiSummaryQuery.data?.stale_data_warning ? (
              <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-amber">
                <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Stale AI warning</div>
                <p className="mt-1 text-xs text-muted-foreground">Signals may be stale for {aiSummaryQuery.data.stale_symbols.join(", ") || "some symbols"}.</p>
              </div>
            ) : null}

            <RankedAnalysis title="Most constructive by AI score" items={topConstructive} tone="positive" onSelect={setSelectedAnalysisSymbol} />
            <RankedAnalysis title="Most cautious by AI score" items={topCautious} tone="negative" onSelect={setSelectedAnalysisSymbol} />

            <details className="rounded-xl border border-primary/15 bg-white/45 p-3" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-foreground">
                <Settings2 size={16} /> AI settings and scheduler
              </summary>
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={aiForm.enabled}
                    onChange={(event) => setAIForm((current) => ({ ...current, enabled: event.target.checked }))}
                  />
                  Enable scheduled AI analysis for this watchlist
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LabeledControl label="Cadence">
                    <Select
                      value={String(aiForm.cadence_minutes)}
                      onChange={(event) => setAIForm((current) => ({ ...current, cadence_minutes: Number(event.target.value) }))}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="120">120 minutes</option>
                    </Select>
                  </LabeledControl>
                  <LabeledControl label="Provider">
                    <Select
                      value={aiForm.provider_name}
                      onChange={(event) => setAIForm((current) => ({ ...current, provider_name: event.target.value }))}
                    >
                      {providerNames.map((providerName) => {
                        const status = aiStatusQuery.data?.providers.find((provider) => provider.provider_name === providerName);
                        return (
                          <option key={providerName} value={providerName}>
                            {providerName} {status && !status.ready ? "(fallback / unavailable)" : ""}
                          </option>
                        );
                      })}
                    </Select>
                  </LabeledControl>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <LabeledControl label="Max stocks">
                    <Input
                      value={String(aiForm.max_stocks_per_job)}
                      onChange={(event) => setAIForm((current) => ({ ...current, max_stocks_per_job: Number(event.target.value) || 1 }))}
                    />
                  </LabeledControl>
                  <LabeledControl label="Parallel agents">
                    <Input
                      value={String(aiForm.max_parallel_agents)}
                      onChange={(event) => setAIForm((current) => ({ ...current, max_parallel_agents: Number(event.target.value) || 1 }))}
                    />
                  </LabeledControl>
                  <LabeledControl label="Stale after min">
                    <Input
                      value={String(aiForm.stale_after_minutes)}
                      onChange={(event) => setAIForm((current) => ({ ...current, stale_after_minutes: Number(event.target.value) || 15 }))}
                    />
                  </LabeledControl>
                </div>
                <div className="space-y-2">
                  <span className="label-eyebrow">Categories</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORY_OPTIONS.map((option) => {
                      const active = aiForm.categories.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                            active
                              ? "border-primary/40 bg-primary/15 text-foreground"
                              : "border-border bg-white/45 text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() =>
                            setAIForm((current) => ({
                              ...current,
                              categories: current.categories.includes(option.value)
                                ? current.categories.filter((value) => value !== option.value)
                                : [...current.categories, option.value],
                            }))
                          }
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    className="gap-2"
                    disabled={!selectedWatchlistId || saveAISettingsMutation.isPending}
                    onClick={() => selectedWatchlistId && saveAISettingsMutation.mutate({ watchlistId: selectedWatchlistId, payload: aiForm })}
                  >
                    <Save size={15} /> {saveAISettingsMutation.isPending ? "Saving…" : "Save settings"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={!selectedWatchlistId || runAIMutation.isPending}
                    onClick={() => selectedWatchlistId && runAIMutation.mutate({ watchlistId: selectedWatchlistId, force: true })}
                  >
                    <Play size={15} /> {runAIMutation.isPending ? "Running…" : "Run now"}
                  </Button>
                </div>
              </div>
            </details>
          </Card>

          <Card className="panel-elevated space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label-eyebrow">Stock analysis detail</div>
                <h3 className="font-display text-xl font-semibold text-white">Why the research view changed</h3>
              </div>
              <Badge tone="neutral">{analysisDetailQuery.data?.analysis.overall_signal ?? "select"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {analysisDetailQuery.data?.analysis.executive_summary ?? "Select an analyzed symbol from the rail or a card to inspect latest factors, confidence, and source provenance."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <MiniStat label="Confidence" value={formatNumber(analysisDetailQuery.data?.analysis.confidence_score, 2)} icon={<BrainCircuit size={15} />} />
              <MiniStat label="Created" value={formatDateTime(analysisDetailQuery.data?.created_at)} icon={<CalendarClock size={15} />} />
            </div>
            <div className="grid gap-3">
              <FactorColumn title="Supportive factors" items={bullishFactors.map((item) => item.detail)} tone="positive" />
              <FactorColumn title="Risk / pressure factors" items={bearishFactors.map((item) => item.detail)} tone="negative" />
              <FactorColumn title="Context / incomplete evidence" items={neutralFactors.map((item) => item.detail)} tone="neutral" />
            </div>
            <details className="rounded-xl border border-primary/15 bg-white/45 p-3">
              <summary className="cursor-pointer list-none font-semibold text-foreground">Summaries and source provenance</summary>
              <div className="mt-3 grid gap-3">
                <SummaryCard title="Financials" body={analysisDetailQuery.data?.analysis.financial_health_summary} />
                <SummaryCard title="Technicals" body={analysisDetailQuery.data?.analysis.technical_summary} />
                <SummaryCard title="Events" body={analysisDetailQuery.data?.analysis.event_summary} />
                <SummaryCard title="Options" body={analysisDetailQuery.data?.analysis.options_summary} />
                <SummaryCard title="Geo / Regulation" body={[analysisDetailQuery.data?.analysis.geo_political_impact, analysisDetailQuery.data?.analysis.regulation_impact].filter(Boolean).join(" ")} />
                <SummaryCard title="Source Health" body={analysisDetailQuery.data?.analysis.source_health_summary} />
                {(analysisDetailQuery.data?.analysis.source_refs ?? []).slice(0, 6).map((source) => (
                  <div key={`${source.source_name}-${source.title}`} className="rounded-lg border border-border bg-white/45 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{source.title ?? source.source_name}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeMinutes(source.freshness_minutes)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{source.snippet ?? "No snippet available."}</p>
                  </div>
                ))}
              </div>
            </details>
          </Card>
        </aside>
      </div>

      {convertingSymbol ? (
        <PositionEntryModal symbol={convertingSymbol} onClose={() => setConvertingSymbol(null)} />
      ) : null}
      {reportSymbol ? (
        <AnalystReportPanel symbol={reportSymbol} onClose={() => setReportSymbol(null)} />
      ) : null}
    </div>
  );
};

const HeroMetric = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "positive" | "negative";
}) => (
  <div className="rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur">
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">{label}</div>
    <div className={`mt-1 font-display text-xl font-semibold ${tone === "ok" || tone === "positive" ? "text-emerald-100" : tone === "warn" || tone === "negative" ? "text-amber-100" : "text-white"}`}>
      {value}
    </div>
  </div>
);

const ResearchCard = ({
  item,
  analysis,
  onSelect,
  onOpenReport,
  onTrack,
  onAnalyze,
  onAlert,
  onRemove,
  removing,
}: {
  item: WatchlistItem;
  analysis?: AIAnalysisListItem;
  onSelect: () => void;
  onOpenReport: () => void;
  onTrack: () => void;
  onAnalyze: () => void;
  onAlert: () => void;
  onRemove: () => void;
  removing: boolean;
}) => (
  <Card className="panel-elevated group flex min-h-[360px] flex-col gap-4 overflow-hidden border-primary/15">
    <div className="flex items-start justify-between gap-3">
      <button className="min-w-0 text-left" onClick={onSelect}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ticker text-lg text-foreground">{item.symbol}</span>
          <Badge tone="neutral">{item.exchange ?? "market?"}</Badge>
          {item.asset_type ? <Badge tone="neutral">{item.asset_type}</Badge> : null}
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">{item.name ?? "Name unavailable"}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{[item.sector, item.industry].filter(Boolean).join(" · ") || "Sector metadata missing"}</p>
      </button>
      <FreshnessPill updatedAt={item.updated_at} />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <MetricTile label="Price" value={formatNumber(item.price, 2)} helper={formatCompact(item.market_cap)} />
      <MetricTile label="1D move" value={formatPercent(item.change_1d)} valueClass={changeClass(item.change_1d)} helper={`5D ${formatPercent(item.change_5d)}`} />
      <MetricTile label="RSI / trend" value={formatNumber(item.rsi_14, 1)} helper={trendLabel(item)} />
      <MetricTile label="Volume" value={formatCompact(item.volume)} helper={volumeLabel(item)} />
    </div>

    <div className="grid gap-2 rounded-2xl border border-primary/15 bg-white/45 p-3 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <span>Valuation</span>
        <span className="font-mono text-foreground">P/E {formatNumber(item.pe, 1)} · P/B {formatNumber(item.pb, 1)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>Options context</span>
        <span className="font-mono text-foreground">PCR {formatNumber(item.pcr, 2)} · IV {formatPercent(item.iv)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>Risk range</span>
        <span className="font-mono text-foreground">ATR {formatNumber(item.atr_14, 2)}</span>
      </div>
    </div>

    <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BrainCircuit size={16} className="text-secondary" /> AI research context
        </div>
        <Badge tone={analysis?.overall_score && analysis.overall_score > 0 ? "positive" : analysis?.overall_score && analysis.overall_score < 0 ? "negative" : "neutral"}>
          {analysis?.overall_signal ?? "no_data"}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
        {analysis?.executive_summary ?? "No latest AI summary yet. Run analysis to add evidence-backed context."}
      </p>
    </div>

    <div className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Button variant="outline" className="min-h-11 gap-1 px-2 text-xs" onClick={onOpenReport}><FileText size={14} /> Report</Button>
      <Button variant="outline" className="min-h-11 gap-1 px-2 text-xs" onClick={onTrack}><PlusCircle size={14} /> Track</Button>
      <Button variant="outline" className="min-h-11 gap-1 px-2 text-xs" onClick={onAlert}><BellPlus size={14} /> Alert</Button>
      <Button variant="ghost" className="min-h-11 gap-1 px-2 text-xs text-muted-foreground hover:text-bear" disabled={removing} onClick={onRemove}><X size={14} /> Remove</Button>
    </div>
    <Button variant="ghost" className="-mt-2 justify-start gap-2 px-0 text-xs text-secondary" onClick={onAnalyze}>
      <BrainCircuit size={14} /> Open detailed AI factors
    </Button>
  </Card>
);

const DataNote = ({ icon, title, body }: { icon: ReactNode; title: string; body: string }) => (
  <div className="rounded-2xl border border-primary/15 bg-white/45 p-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon}{title}</div>
    <p className="mt-1 text-xs text-muted-foreground">{body}</p>
  </div>
);

const EmptyWatchlistState = ({ onCreate }: { onCreate: () => void }) => (
  <Card className="panel-elevated space-y-3 text-center">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary">
      <Waves size={28} />
    </div>
    <h3 className="font-display text-xl font-semibold text-white">Start with a simple watch hub</h3>
    <p className="muted mx-auto max-w-xl text-sm">Create a list, add validated symbols, then use mobile cards for quick research and desktop tables for comparison.</p>
    <Button className="mx-auto gap-2" onClick={onCreate}><PlusCircle size={15} /> Create list</Button>
  </Card>
);

const CsvImportPanel = ({
  csvText,
  setCsvText,
  disabled,
  onImport,
}: {
  csvText: string;
  setCsvText: (value: string) => void;
  disabled: boolean;
  onImport: () => void;
}) => (
  <Card className="panel-elevated space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="label-eyebrow">Bulk add</div>
        <h3 className="font-display text-lg font-semibold text-white">CSV import</h3>
      </div>
      <FileUp className="text-primary" size={18} />
    </div>
    <textarea
      value={csvText}
      onChange={(event) => setCsvText(event.target.value)}
      className="h-28 w-full rounded-lg border border-border bg-input p-3 font-mono text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground/60 focus:border-ring focus:ring"
    />
    <Button variant="outline" className="w-full gap-2" disabled={disabled} onClick={onImport}>
      <FileUp size={15} /> Import CSV
    </Button>
  </Card>
);

const AlertPanel = ({
  alertSymbol,
  setAlertSymbol,
  alertCondition,
  setAlertCondition,
  alertTarget,
  setAlertTarget,
  createAlertMutation,
}: {
  alertSymbol: string;
  setAlertSymbol: (value: string) => void;
  alertCondition: string;
  setAlertCondition: (value: string) => void;
  alertTarget: string;
  setAlertTarget: (value: string) => void;
  createAlertMutation: ReturnType<typeof useMutation<unknown, Error, { symbol: string; condition: string; target: number }>>;
}) => (
  <Card className="panel-elevated space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="label-eyebrow">Watch triggers</div>
        <h3 className="font-display text-lg font-semibold text-white">Create alert</h3>
      </div>
      <BellPlus className="text-primary" size={18} />
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <Input value={alertSymbol} onChange={(event) => setAlertSymbol(event.target.value.toUpperCase())} placeholder="Symbol" />
      <Select value={alertCondition} onChange={(event) => setAlertCondition(event.target.value)}>
        <option value="price_gt">Price &gt;</option>
        <option value="price_lt">Price &lt;</option>
        <option value="change_1d_gt">Day Change &gt;</option>
        <option value="volume_spike_gt">Volume Spike &gt;</option>
      </Select>
      <Input value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)} placeholder="Target" />
    </div>
    {createAlertMutation.isSuccess ? <p className="text-xs text-bull">Alert created successfully.</p> : null}
    {createAlertMutation.isError ? <p className="text-xs text-bear">Failed to create alert — check symbol and try again.</p> : null}
    <Button
      className="w-full gap-2"
      disabled={createAlertMutation.isPending || !alertSymbol.trim() || !alertTarget}
      onClick={() => createAlertMutation.mutate({ symbol: alertSymbol, condition: alertCondition, target: Number(alertTarget) })}
    >
      <BellPlus size={15} /> {createAlertMutation.isPending ? "Creating…" : "Create alert"}
    </Button>
  </Card>
);

const MetricTile = ({ label, value, helper, valueClass }: { label: string; value: string; helper?: string; valueClass?: string }) => (
  <div className="rounded-2xl border border-primary/15 bg-white/45 p-3">
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className={`mt-1 font-display text-xl font-semibold ${valueClass ?? "text-foreground"}`}>{value}</p>
    {helper ? <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p> : null}
  </div>
);

const MiniStat = ({ label, value, icon }: { label: string; value: string; icon: ReactNode }) => (
  <div className="rounded-2xl border border-primary/15 bg-white/45 p-3">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
    <p className="mt-2 break-words font-semibold text-foreground">{value}</p>
  </div>
);

const RankedAnalysis = ({
  title,
  items,
  tone,
  onSelect,
}: {
  title: string;
  items: AIAnalysisListItem[];
  tone: "positive" | "negative";
  onSelect: (symbol: string) => void;
}) => (
  <div>
    <p className="label-eyebrow">{title}</p>
    <div className="mt-2 space-y-2">
      {items.length ? items.map((item) => (
        <button key={`${title}-${item.symbol}`} className="w-full rounded-xl border border-primary/15 bg-white/45 px-3 py-2 text-left transition hover:border-primary/35" onClick={() => onSelect(item.symbol)}>
          <div className="flex items-center justify-between gap-2">
            <span className="ticker text-foreground">{item.symbol}</span>
            <Badge tone={tone}>{formatNumber(item.overall_score, 2)}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.executive_summary}</p>
        </button>
      )) : <p className="rounded-xl border border-border bg-white/45 p-3 text-xs text-muted-foreground">No AI rankings yet.</p>}
    </div>
  </div>
);

const FactorColumn = ({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "negative" | "neutral";
}) => (
  <div className="rounded-xl border border-primary/15 bg-white/45 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
    <div className="mt-2 space-y-2 text-sm">
      {items.length ? (
        items.slice(0, 4).map((item) => (
          <p key={item} className={tone === "positive" ? "positive" : tone === "negative" ? "negative" : "text-muted-foreground"}>
            {item}
          </p>
        ))
      ) : (
        <p className="muted text-xs">No items</p>
      )}
    </div>
  </div>
);

const SummaryCard = ({ title, body }: { title: string; body?: string | null }) => (
  <div className="rounded-xl border border-primary/15 bg-white/45 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
    <p className="mt-2 text-sm text-foreground/80">{body || "No summary yet."}</p>
  </div>
);

const LabeledControl = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="label-eyebrow">{label}</span>
    {children}
  </label>
);

const IconAction = ({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) => (
  <button
    title={label}
    aria-label={label}
    className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white/45 text-muted-foreground transition hover:border-primary/40 hover:text-primary"
    onClick={onClick}
  >
    {children}
  </button>
);

const FreshnessPill = ({ updatedAt }: { updatedAt?: string | null }) => {
  const age = getAgeMinutes(updatedAt);
  if (age === null) {
    return <Badge tone="negative">missing</Badge>;
  }
  if (age > 180) {
    return <Badge tone="negative">stale {formatRelativeMinutes(age)}</Badge>;
  }
  return <Badge tone="positive">cached {formatRelativeMinutes(age)}</Badge>;
};

const getAgeMinutes = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - parsed.getTime()) / 60_000));
};

const formatPercent = (value: number | null | undefined, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value > 0 ? "+" : ""}${formatNumber(value, digits)}%`;
};

const changeClass = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "text-foreground";
  return value > 0 ? "text-bull" : "text-bear";
};

const changeTone = (value: number | null | undefined): "neutral" | "positive" | "negative" => {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
};

const trendLabel = (item: WatchlistItem) => {
  if (item.price === null || item.price === undefined || (!item.sma_50 && !item.sma_200)) return "trend missing";
  if (item.sma_50 && item.sma_200 && item.price > item.sma_50 && item.price > item.sma_200) return "above 50/200 SMA";
  if (item.sma_50 && item.sma_200 && item.price < item.sma_50 && item.price < item.sma_200) return "below 50/200 SMA";
  if (item.sma_50 && item.price > item.sma_50) return "above 50 SMA";
  if (item.sma_50 && item.price < item.sma_50) return "below 50 SMA";
  return "mixed trend";
};

const volumeLabel = (item: WatchlistItem) => {
  if (item.volume_spike === null || item.volume_spike === undefined) return "spike missing";
  if (item.volume_spike >= 2) return `${formatNumber(item.volume_spike, 1)}x spike`;
  if (item.volume_spike >= 1.2) return `${formatNumber(item.volume_spike, 1)}x active`;
  return `${formatNumber(item.volume_spike, 1)}x normal`;
};
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellPlus, BrainCircuit, FileUp, FileText, Play, PlusCircle, Save, Trash2, X } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { PositionEntryModal } from "@/components/PositionEntryModal";
import { AnalystReportPanel } from "@/components/AnalystReportPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { AIAnalysisCategory, AIWatchlistSettings } from "@/lib/types";
import { formatDateTime, formatNumber, formatRelativeMinutes } from "@/lib/utils";

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
    if (!selectedWatchlistId && watchlistsQuery.data?.length) {
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
    if (!selectedAnalysisSymbol && aiAnalysesQuery.data?.length) {
      setSelectedAnalysisSymbol(aiAnalysesQuery.data[0].symbol);
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
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: ({ symbol, condition, target }: { symbol: string; condition: string; target: number }) =>
      api.createAlert(symbol, condition, target),
  });

  const importCsvMutation = useMutation({
    mutationFn: ({ watchlistId, csvData }: { watchlistId: number; csvData: string }) =>
      api.importWatchlistCsv(watchlistId, csvData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["watchlists"] });
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

  const bullishFactors = analysisDetailQuery.data?.analysis.factors.filter((item) => item.factor_type === "bullish") ?? [];
  const bearishFactors = analysisDetailQuery.data?.analysis.factors.filter((item) => item.factor_type === "bearish") ?? [];
  const neutralFactors = analysisDetailQuery.data?.analysis.factors.filter((item) => item.factor_type === "neutral") ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Watchlists · AI analysis"
        title="Watchlist intelligence board"
        subtitle="Manage symbols, alerts, scheduled AI analysis, source health, and stock-level reasoning from one command surface."
        actions={
          <>
            <StatusPill tone="info">{watchlistsQuery.data?.length ?? 0} lists</StatusPill>
            <StatusPill tone={aiStatusQuery.data?.ai_analysis_enabled ? "ai" : "warn"}>
              {aiStatusQuery.data?.ai_analysis_enabled ? "AI Ready" : "AI Disabled"}
            </StatusPill>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.2fr_1.15fr]">
      <Card className="panel-elevated space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-white">Watchlists</h2>
          <Badge>{watchlistsQuery.data?.length ?? 0}</Badge>
        </div>
        {selectedWatchlist && (
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20 disabled:opacity-40"
            disabled={deleteWatchlistMutation.isPending}
            onClick={() => {
              if (!window.confirm(`Delete watchlist "${selectedWatchlist.name}"? This cannot be undone.`)) return;
              deleteWatchlistMutation.mutate(selectedWatchlist.id);
            }}
          >
            <Trash2 size={12} />
            Delete "{selectedWatchlist.name}"
          </button>
        )}
        <div className="flex gap-2">
          <Input value={newWatchlistName} onChange={(event) => setNewWatchlistName(event.target.value)} placeholder="New watchlist name" />
          <Button
            className="gap-2"
            onClick={() => {
              if (!newWatchlistName.trim()) return;
              createWatchlistMutation.mutate(newWatchlistName.trim());
            }}
          >
            <PlusCircle size={15} />
            Create
          </Button>
        </div>

        <div className="space-y-2">
          {(watchlistsQuery.data ?? []).map((watchlist) => {
            const summary = watchlist.id === selectedWatchlistId ? aiSummaryQuery.data : undefined;
            return (
              <button
                key={watchlist.id}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  selectedWatchlistId === watchlist.id
                    ? "border-glacier bg-glacier/15"
                    : "border-slate-500/20 bg-slate-900/35 hover:border-slate-300/40"
                }`}
                onClick={() => {
                  setSelectedWatchlistId(watchlist.id);
                  setSelectedAnalysisSymbol(null);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-100">{watchlist.name}</p>
                  <Badge tone="neutral">{watchlist.items.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {watchlist.items.slice(0, 4).map((item) => item.symbol).join(", ") || "No symbols yet"}
                </p>
                {summary ? (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                    <span>AI: {summary.overall_sentiment}</span>
                    <span>{summary.provider_name}</span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="panel-elevated space-y-3">
          <h3 className="font-display text-base text-white">Manage Symbols</h3>
          <Select
            value={selectedWatchlistId ? String(selectedWatchlistId) : ""}
            onChange={(event) => {
              setSelectedWatchlistId(event.target.value ? Number(event.target.value) : null);
              setSelectedAnalysisSymbol(null);
            }}
          >
            <option value="">Select watchlist</option>
            {(watchlistsQuery.data ?? []).map((watchlist) => (
              <option key={watchlist.id} value={watchlist.id}>
                {watchlist.name}
              </option>
            ))}
          </Select>
          <Input
            value={symbolsInput}
            onChange={(event) => setSymbolsInput(event.target.value)}
            placeholder="Comma-separated symbols"
          />
          <Button
            disabled={addItemsMutation.isPending}
            onClick={() => {
              if (!selectedWatchlistId || !symbolsInput.trim()) return;
              const symbols = symbolsInput.split(",").map((symbol) => symbol.trim()).filter(Boolean);
              addItemsMutation.mutate({ watchlistId: selectedWatchlistId, symbols });
            }}
          >
            {addItemsMutation.isPending ? "Adding..." : "Add Symbols"}
          </Button>

          {selectedWatchlist && selectedWatchlist.items.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-400">Current symbols</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedWatchlist.items.map((item) => (
                  <span
                    key={item.symbol}
                    className="flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-200"
                  >
                    {item.symbol}
                    <button
                      className="ml-1 text-slate-400 hover:text-sky-500 transition"
                      onClick={() => setReportSymbol(item.symbol)}
                      title="Analyst Report"
                    >
                      <FileText size={10} />
                    </button>
                    <button
                      className="ml-0.5 text-slate-400 hover:text-violet-400 transition"
                      onClick={() => setConvertingSymbol(item.symbol)}
                      title="Add to Portfolio"
                    >
                      <PlusCircle size={10} />
                    </button>
                    <button
                      className="ml-0.5 text-slate-400 hover:text-red-400 transition disabled:opacity-40"
                      disabled={removeItemMutation.isPending}
                      onClick={() => removeItemMutation.mutate({ watchlistId: selectedWatchlist.id, symbol: item.symbol })}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            className="h-24 w-full rounded-lg border border-slate-500/40 bg-slate-900/60 p-3 text-xs text-slate-200"
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (!selectedWatchlistId) return;
              importCsvMutation.mutate({ watchlistId: selectedWatchlistId, csvData: csvText });
            }}
          >
            <FileUp size={15} />
            Import CSV
          </Button>
        </Card>

        <Card className="panel-elevated space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base text-white">AI Watchlist Settings</h3>
              <p className="muted text-xs">Enable scheduled analysis and choose the signal mix.</p>
            </div>
            <Badge tone={aiStatusQuery.data?.ai_analysis_enabled ? "positive" : "neutral"}>
              {aiStatusQuery.data?.ai_analysis_enabled ? "AI Ready" : "AI Disabled"}
            </Badge>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={aiForm.enabled}
              onChange={(event) => setAIForm((current) => ({ ...current, enabled: event.target.checked }))}
            />
            Enable AI auto-analysis for this watchlist
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Cadence</span>
              <Select
                value={String(aiForm.cadence_minutes)}
                onChange={(event) => setAIForm((current) => ({ ...current, cadence_minutes: Number(event.target.value) }))}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
                <option value="120">120 minutes</option>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Provider</span>
              <Select
                value={aiForm.provider_name}
                onChange={(event) => setAIForm((current) => ({ ...current, provider_name: event.target.value }))}
              >
                {(aiStatusQuery.data?.providers ?? []).map((provider) => (
                  <option key={provider.provider_name} value={provider.provider_name}>
                    {provider.provider_name} {provider.ready ? "" : "(fallback / unavailable)"}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={String(aiForm.max_stocks_per_job)}
              onChange={(event) => setAIForm((current) => ({ ...current, max_stocks_per_job: Number(event.target.value) || 1 }))}
              placeholder="Max stocks per job"
            />
            <Input
              value={String(aiForm.max_parallel_agents)}
              onChange={(event) => setAIForm((current) => ({ ...current, max_parallel_agents: Number(event.target.value) || 1 }))}
              placeholder="Max parallel agents"
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Categories</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORY_OPTIONS.map((option) => {
                const active = aiForm.categories.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-glacier bg-glacier/15 text-white"
                        : "border-slate-500/25 bg-slate-900/35 text-slate-300"
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
          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2"
              onClick={() => {
                if (!selectedWatchlistId) return;
                saveAISettingsMutation.mutate({ watchlistId: selectedWatchlistId, payload: aiForm });
              }}
            >
              <Save size={15} />
              Save Settings
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (!selectedWatchlistId) return;
                runAIMutation.mutate({ watchlistId: selectedWatchlistId, force: true });
              }}
            >
              <Play size={15} />
              Run Now
            </Button>
          </div>
        </Card>

        <Card className="panel-elevated space-y-3">
          <h3 className="font-display text-base text-white">Alerts</h3>
          <Input value={alertSymbol} onChange={(event) => setAlertSymbol(event.target.value.toUpperCase())} placeholder="Symbol" />
          <Select value={alertCondition} onChange={(event) => setAlertCondition(event.target.value)}>
            <option value="price_gt">Price &gt;</option>
            <option value="price_lt">Price &lt;</option>
            <option value="change_1d_gt">Day Change &gt;</option>
            <option value="volume_spike_gt">Volume Spike &gt;</option>
          </Select>
          <Input value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)} placeholder="Target value" />
          <Button
            className="gap-2"
            onClick={() =>
              createAlertMutation.mutate({
                symbol: alertSymbol,
                condition: alertCondition,
                target: Number(alertTarget),
              })
            }
          >
            <BellPlus size={15} />
            Create Alert
          </Button>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="panel-elevated space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base text-white">AI Summary</h3>
              <p className="muted text-xs">Latest watchlist run, sentiment, and strongest names.</p>
            </div>
            <Badge tone="neutral">{aiSummaryQuery.data?.overall_sentiment ?? "no_data"}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-900/35 p-3 text-sm text-slate-200">
              <div className="flex items-center gap-2 text-white">
                <BrainCircuit size={16} />
                AI run window
              </div>
              <p className="mt-2 text-xs text-slate-300">Last run: {formatDateTime(aiSummaryQuery.data?.last_run_time)}</p>
              <p className="mt-1 text-xs text-slate-300">Next run: {formatDateTime(aiSummaryQuery.data?.next_run_time)}</p>
              <p className="mt-1 text-xs text-slate-300">Provider: {aiSummaryQuery.data?.provider_name ?? "-"}</p>
            </div>
            <div className="rounded-xl bg-slate-900/35 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400">Stale Warning</p>
              <p className="mt-2 text-sm text-white">
                {aiSummaryQuery.data?.stale_data_warning
                  ? `Stale signals in ${aiSummaryQuery.data.stale_symbols.join(", ")}`
                  : "No stale-data warning on the latest watchlist summary."}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Top Bullish</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(aiSummaryQuery.data?.top_bullish_names ?? []).map((name) => (
                  <Badge key={name} tone="positive">{name}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Top Bearish</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(aiSummaryQuery.data?.top_bearish_names ?? []).map((name) => (
                  <Badge key={name} tone="negative">{name}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {(aiAnalysesQuery.data ?? []).map((analysis) => (
              <button
                key={analysis.symbol}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selectedAnalysisSymbol === analysis.symbol
                    ? "border-glacier bg-glacier/15"
                    : "border-slate-500/20 bg-slate-900/35"
                }`}
                onClick={() => setSelectedAnalysisSymbol(analysis.symbol)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{analysis.symbol}</span>
                  <Badge tone="neutral">{analysis.overall_signal}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-300">{analysis.executive_summary}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="panel-elevated space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base text-white">Stock Analysis Detail</h3>
              <p className="muted text-xs">Factors, provenance, and why the view changed.</p>
            </div>
            <Badge tone="neutral">{analysisDetailQuery.data?.analysis.overall_signal ?? "select symbol"}</Badge>
          </div>
          <p className="text-sm text-slate-200">{analysisDetailQuery.data?.analysis.executive_summary ?? "Choose an analyzed symbol to inspect its latest AI summary."}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-900/35 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400">Confidence</p>
              <p className="mt-1 text-xl font-display text-white">{formatNumber(analysisDetailQuery.data?.analysis.confidence_score, 2)}</p>
              <p className="mt-2 text-xs text-slate-300">Created: {formatDateTime(analysisDetailQuery.data?.created_at)}</p>
              <p className="mt-1 text-xs text-slate-300">Expires: {formatDateTime(analysisDetailQuery.data?.expires_at)}</p>
            </div>
            <div className="rounded-xl bg-slate-900/35 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400">Why Changed</p>
              <div className="mt-2 space-y-1 text-xs text-slate-300">
                {(analysisDetailQuery.data?.previous_delta.why_changed ?? []).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FactorColumn title="Bullish" items={bullishFactors.map((item) => item.detail)} tone="positive" />
            <FactorColumn title="Bearish" items={bearishFactors.map((item) => item.detail)} tone="negative" />
            <FactorColumn title="Neutral" items={neutralFactors.map((item) => item.detail)} tone="neutral" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard title="Financials" body={analysisDetailQuery.data?.analysis.financial_health_summary} />
            <SummaryCard title="Technicals" body={analysisDetailQuery.data?.analysis.technical_summary} />
            <SummaryCard title="Events" body={analysisDetailQuery.data?.analysis.event_summary} />
            <SummaryCard title="Options" body={analysisDetailQuery.data?.analysis.options_summary} />
            <SummaryCard title="Geo / Regulation" body={[analysisDetailQuery.data?.analysis.geo_political_impact, analysisDetailQuery.data?.analysis.regulation_impact].filter(Boolean).join(" ")} />
            <SummaryCard title="Source Health" body={analysisDetailQuery.data?.analysis.source_health_summary} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Source Provenance</p>
            <div className="mt-2 space-y-2">
              {(analysisDetailQuery.data?.analysis.source_refs ?? []).slice(0, 6).map((source) => (
                <div key={`${source.source_name}-${source.title}`} className="rounded-lg bg-slate-900/35 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-100">{source.title ?? source.source_name}</span>
                    <span className="text-xs text-slate-400">{formatRelativeMinutes(source.freshness_minutes)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{source.snippet ?? "No snippet available."}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      </div>
      
      {convertingSymbol && (
        <PositionEntryModal symbol={convertingSymbol} onClose={() => setConvertingSymbol(null)} />
      )}
      {reportSymbol && (
        <AnalystReportPanel symbol={reportSymbol} onClose={() => setReportSymbol(null)} />
      )}
    </div>
  );
};

const FactorColumn = ({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "negative" | "neutral";
}) => (
  <div className="rounded-xl bg-slate-900/35 p-3">
    <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
    <div className="mt-2 space-y-2 text-sm">
      {items.length ? (
        items.slice(0, 4).map((item) => (
          <p key={item} className={tone === "positive" ? "positive" : tone === "negative" ? "negative" : "text-slate-300"}>
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
  <div className="rounded-xl bg-slate-900/35 p-3">
    <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
    <p className="mt-2 text-sm text-slate-200">{body || "No summary yet."}</p>
  </div>
);

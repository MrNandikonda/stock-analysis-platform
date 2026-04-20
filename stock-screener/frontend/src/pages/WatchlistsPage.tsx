import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellPlus, FileUp, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export const WatchlistsPage = () => {
  const queryClient = useQueryClient();
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [symbolsInput, setSymbolsInput] = useState("");
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertCondition, setAlertCondition] = useState("price_gt");
  const [alertTarget, setAlertTarget] = useState("0");
  const [csvText, setCsvText] = useState("symbol\nRELIANCE\nAAPL");

  const watchlistsQuery = useQuery({
    queryKey: ["watchlists"],
    queryFn: api.getWatchlists,
  });

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

  const selectedWatchlist = useMemo(
    () => watchlistsQuery.data?.find((watchlist) => watchlist.id === selectedWatchlistId) ?? null,
    [watchlistsQuery.data, selectedWatchlistId],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-white">Watchlists</h2>
          <Badge>{watchlistsQuery.data?.length ?? 0}</Badge>
        </div>
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
          {(watchlistsQuery.data ?? []).map((watchlist) => (
            <button
              key={watchlist.id}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                selectedWatchlistId === watchlist.id
                  ? "border-glacier bg-glacier/15"
                  : "border-slate-500/20 bg-slate-900/35 hover:border-slate-300/40"
              }`}
              onClick={() => setSelectedWatchlistId(watchlist.id)}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-100">{watchlist.name}</p>
                <Badge tone="neutral">{watchlist.items.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {watchlist.items.slice(0, 4).map((item) => item.symbol).join(", ") || "No symbols yet"}
              </p>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="space-y-3">
          <h3 className="font-display text-base text-white">Manage Symbols</h3>
          <Select
            value={selectedWatchlistId ? String(selectedWatchlistId) : ""}
            onChange={(event) => setSelectedWatchlistId(event.target.value ? Number(event.target.value) : null)}
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
            onClick={() => {
              if (!selectedWatchlistId || !symbolsInput.trim()) return;
              const symbols = symbolsInput.split(",").map((symbol) => symbol.trim()).filter(Boolean);
              addItemsMutation.mutate({ watchlistId: selectedWatchlistId, symbols });
            }}
          >
            Add Symbols
          </Button>

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

        <Card className="space-y-3">
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

        <Card className="space-y-2">
          <h3 className="font-display text-base text-white">Selected Watchlist Snapshot</h3>
          <div className="space-y-1">
            {(selectedWatchlist?.items ?? []).slice(0, 10).map((item) => (
              <div key={item.symbol} className="flex items-center justify-between rounded-lg bg-slate-900/35 px-3 py-2 text-sm">
                <span className="text-slate-100">{item.symbol}</span>
                <span className={(item.change_1d ?? 0) >= 0 ? "positive" : "negative"}>
                  {formatNumber(item.change_1d, 2)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

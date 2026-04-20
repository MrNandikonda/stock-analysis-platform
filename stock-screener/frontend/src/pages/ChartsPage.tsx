import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { CandlestickPanel } from "@/components/CandlestickPanel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "1D", "1W"];

const TIMEFRAME_MAP: Record<string, { period: string; interval: string }> = {
  "1m": { period: "5d", interval: "1m" },
  "5m": { period: "1mo", interval: "5m" },
  "15m": { period: "3mo", interval: "15m" },
  "1h": { period: "6mo", interval: "60m" },
  "1D": { period: "1y", interval: "1d" },
  "1W": { period: "5y", interval: "1wk" },
};

export const ChartsPage = () => {
  const { selectedSymbol, setSelectedSymbol } = useAppStore();
  const [symbolInput, setSymbolInput] = useState(selectedSymbol);
  const [exchange, setExchange] = useState("NSE");
  const [timeframe, setTimeframe] = useState("1D");

  const historyQuery = useQuery({
    queryKey: ["history", selectedSymbol, exchange, timeframe],
    queryFn: () => {
      const mapping = TIMEFRAME_MAP[timeframe];
      return api.getPriceHistory(selectedSymbol, mapping.period, mapping.interval);
    },
    staleTime: 20_000,
  });

  const optionsQuery = useQuery({
    queryKey: ["options", selectedSymbol, exchange],
    queryFn: () => api.getOptionsChain(selectedSymbol, exchange === "NSE" ? "NSE" : "US"),
    staleTime: 20_000,
  });

  const onApplySymbol = () => setSelectedSymbol(symbolInput);

  return (
    <div className="space-y-5">
      <Card className="grid gap-3 sm:grid-cols-4">
        <Input value={symbolInput} onChange={(event) => setSymbolInput(event.target.value.toUpperCase())} />
        <Select value={exchange} onChange={(event) => setExchange(event.target.value)}>
          <option value="NSE">NSE</option>
          <option value="US">US</option>
        </Select>
        <Select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
          {TIMEFRAMES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <button
          className="rounded-lg bg-sunrise px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          onClick={onApplySymbol}
        >
          Load
        </button>
      </Card>

      <CandlestickPanel symbol={selectedSymbol} rows={historyQuery.data ?? []} />

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-white">F&O Snapshot</h3>
          <Badge tone="neutral">{exchange === "NSE" ? "NSE Options Chain" : "US Options Snapshot"}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="PCR" value={formatNumber(optionsQuery.data?.pcr ?? null, 2)} />
          <Metric label="IV" value={formatNumber(optionsQuery.data?.iv ?? null, 2)} />
          <Metric label="Max Pain" value={formatNumber(optionsQuery.data?.max_pain ?? null, 2)} />
          <Metric label="Rows" value={String(optionsQuery.data?.rows?.length ?? 0)} />
        </div>
      </Card>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-500/20 bg-slate-900/40 p-3">
    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
  </div>
);

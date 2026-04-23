import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { CandlestickPanel } from "@/components/CandlestickPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
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
      <PageHeader
        eyebrow="Charts · Technical workspace"
        title="Price action terminal"
        subtitle="Inspect cached/fresh OHLCV data, options context, and technical timeframes without leaving the cockpit."
        actions={
          <>
            <StatusPill tone="info">{selectedSymbol}</StatusPill>
            <StatusPill tone="warn">{timeframe}</StatusPill>
          </>
        }
      />

      <Card className="panel-elevated grid gap-3 sm:grid-cols-4">
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

      <Card className="panel-elevated space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-white">Options Chain Matrix</h3>
          <Badge tone="neutral">{exchange === "NSE" ? "NSE Options Chain" : "US Options Chain"}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="PCR" value={formatNumber(optionsQuery.data?.pcr ?? null, 2)} />
          <Metric label="IV" value={formatNumber(optionsQuery.data?.iv ?? null, 2)} />
          <Metric label="Max Pain" value={formatNumber(optionsQuery.data?.max_pain ?? null, 2)} />
          <Metric label="Available Strikes" value={String(optionsQuery.data?.rows?.length ?? 0)} />
        </div>
        
        {optionsQuery.data?.rows && optionsQuery.data.rows.length > 0 && (
          <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-background-elevated text-gray-400 shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                <tr>
                  <th className="px-3 py-2 font-medium">CE OI</th>
                  <th className="px-3 py-2 font-medium">CE Vol</th>
                  <th className="px-3 py-2 font-medium">CE LTP</th>
                  <th className="bg-white/5 px-3 py-2 text-center font-bold text-white">Strike</th>
                  <th className="px-3 py-2 font-medium">PE LTP</th>
                  <th className="px-3 py-2 font-medium">PE Vol</th>
                  <th className="px-3 py-2 font-medium">PE OI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {optionsQuery.data.rows.map((row: any) => (
                  <tr key={row.strike} className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2">{formatNumber(row.ce_oi)}</td>
                    <td className="px-3 py-2">{formatNumber(row.ce_volume)}</td>
                    <td className="px-3 py-2 text-green-400">{formatNumber(row.ce_ltp, 2)}</td>
                    <td className="bg-white/5 px-3 py-2 text-center font-bold text-white">{formatNumber(row.strike, 2)}</td>
                    <td className="px-3 py-2 text-red-400">{formatNumber(row.pe_ltp, 2)}</td>
                    <td className="px-3 py-2">{formatNumber(row.pe_volume)}</td>
                    <td className="px-3 py-2">{formatNumber(row.pe_oi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-background-elevated/60 p-3">
    <p className="label-eyebrow">{label}</p>
    <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
  </div>
);

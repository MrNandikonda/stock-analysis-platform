import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#0ea5e9", "#27c48f", "#ff6a3d", "#eab308", "#a855f7", "#ec4899"];

export const PortfolioPage = () => {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState("RELIANCE");
  const [quantity, setQuantity] = useState("10");
  const [avgPrice, setAvgPrice] = useState("2500");
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [assetClass, setAssetClass] = useState("equity");
  const [csvImport, setCsvImport] = useState("");
  const [showCsvImport, setShowCsvImport] = useState(false);

  const holdingsQuery = useQuery({
    queryKey: ["portfolio"],
    queryFn: api.getPortfolio,
  });
  const summaryQuery = useQuery({
    queryKey: ["portfolio-summary"],
    queryFn: api.getPortfolioSummary,
  });
  const historyQuery = useQuery({
    queryKey: ["portfolio-history"],
    queryFn: () => api.getPortfolioHistory(90),
    staleTime: 300_000,
  });
  const healthQuery = useQuery({
    queryKey: ["portfolio-health"],
    queryFn: api.getPortfolioHealth,
  });

  const addHoldingMutation = useMutation({
    mutationFn: api.addPortfolioHolding,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      void queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: api.deletePortfolioHolding,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      void queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: api.importPortfolioCsv,
    onSuccess: () => {
      setCsvImport("");
      setShowCsvImport(false);
      void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      void queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const sectorData = useMemo(
    () =>
      Object.entries(summaryQuery.data?.sector_allocation ?? {}).map(([name, value]) => ({
        name,
        value,
      })),
    [summaryQuery.data?.sector_allocation],
  );

  const assetData = useMemo(
    () =>
      Object.entries(summaryQuery.data?.asset_class_split ?? {}).map(([name, value]) => ({
        name,
        value,
      })),
    [summaryQuery.data?.asset_class_split],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio · Local ledger"
        title="Holdings control room"
        subtitle="Track positions, allocation, unrealized P&L, day change, and XIRR from your self-hosted SQLite ledger."
        actions={
          <>
            <StatusPill tone="info">{holdingsQuery.data?.length ?? 0} holdings</StatusPill>
            <StatusPill tone={(summaryQuery.data?.unrealized_pnl ?? 0) >= 0 ? "ok" : "fail"}>P&L live</StatusPill>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Invested" value={formatNumber(summaryQuery.data?.total_invested ?? 0, 2)} />
        <StatCard label="Current Value" value={formatNumber(summaryQuery.data?.total_value ?? 0, 2)} />
        <StatCard label="Unrealized P&L" value={formatNumber(summaryQuery.data?.unrealized_pnl ?? 0, 2)} />
        <StatCard label="Day Change" value={formatNumber(summaryQuery.data?.day_change ?? 0, 2)} />
        <StatCard label="XIRR" value={`${formatNumber((summaryQuery.data?.xirr ?? 0) * 100, 2)}%`} />
      </section>

      {historyQuery.data && historyQuery.data.length > 1 && (
        <Card className="panel-elevated space-y-3">
          <h3 className="font-display text-base text-white">Portfolio Equity Curve</h3>
          <p className="muted text-xs">Historical portfolio value vs. invested capital over the last 90 days.</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={historyQuery.data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#27c48f" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#27c48f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Area type="monotone" dataKey="total_value" name="Value" stroke="#0ea5e9" fill="url(#valueGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="total_invested" name="Invested" stroke="#27c48f" fill="url(#investedGrad)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card className="panel-elevated space-y-3">
          <h3 className="font-display text-lg text-white">Add Holding</h3>
          <Input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="Symbol" />
          <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" type="number" />
          <Input value={avgPrice} onChange={(event) => setAvgPrice(event.target.value)} placeholder="Avg price" type="number" />
          <Input value={buyDate} onChange={(event) => setBuyDate(event.target.value)} type="date" />
          <Select value={assetClass} onChange={(event) => setAssetClass(event.target.value)}>
            <option value="equity">Equity</option>
            <option value="f&o">F&O</option>
            <option value="etf">ETF</option>
            <option value="cash">Cash</option>
          </Select>
          <Button
            disabled={addHoldingMutation.isPending}
            onClick={() =>
              addHoldingMutation.mutate({
                symbol,
                quantity: Number(quantity),
                avg_price: Number(avgPrice),
                buy_date: buyDate,
                asset_class: assetClass,
              })
            }
          >
            {addHoldingMutation.isPending ? "Saving..." : "Save Holding"}
          </Button>
          {addHoldingMutation.isError && (
            <p className="text-xs text-red-400">{(addHoldingMutation.error as Error).message}</p>
          )}
          <div className="mt-1 border-t border-slate-700/40 pt-3">
            <button
              className="text-xs text-slate-400 hover:text-slate-200 transition"
              onClick={() => setShowCsvImport((v) => !v)}
            >
              {showCsvImport ? "Hide CSV import ▲" : "Import CSV ▼"}
            </button>
            {showCsvImport && (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-slate-400">Columns: symbol, quantity, avg_price, buy_date, asset_class</p>
                <textarea
                  value={csvImport}
                  onChange={(e) => setCsvImport(e.target.value)}
                  className="h-28 w-full rounded-lg border border-slate-500/40 bg-slate-900/60 p-2 text-xs text-slate-200"
                  placeholder={"symbol,quantity,avg_price,buy_date,asset_class\nAAPL,10,175.00,2024-01-15,equity"}
                />
                <Button
                  variant="outline"
                  disabled={importCsvMutation.isPending || !csvImport.trim()}
                  onClick={() => importCsvMutation.mutate(csvImport)}
                >
                  {importCsvMutation.isPending ? "Importing..." : "Import CSV"}
                </Button>
                {importCsvMutation.isError && (
                  <p className="text-xs text-red-400">{(importCsvMutation.error as Error).message}</p>
                )}
                {importCsvMutation.isSuccess && (
                  <p className="text-xs text-green-400">Import complete.</p>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="h-72">
            <p className="mb-2 text-sm text-slate-300">Sector Allocation</p>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie dataKey="value" data={sectorData} outerRadius={95} innerRadius={48}>
                  {sectorData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card className="h-72">
            <p className="mb-2 text-sm text-slate-300">Asset Class Split</p>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie dataKey="value" data={assetData} outerRadius={95} innerRadius={48}>
                  {assetData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </section>

      <Card className="panel-elevated space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-white">Holdings</h3>
          <Badge tone="neutral">{holdingsQuery.data?.length ?? 0}</Badge>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Avg</th>
                <th className="px-3 py-2">Current</th>
                <th className="px-3 py-2">Market Value</th>
                <th className="px-3 py-2">P&L</th>
                <th className="px-3 py-2">XIRR</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(holdingsQuery.data ?? []).map((holding) => (
                <tr key={holding.id} className="border-t border-slate-700/45">
                  <td className="px-3 py-2 text-slate-100">{holding.symbol}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNumber(holding.quantity, 2)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNumber(holding.avg_price, 2)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNumber(holding.current_price, 2)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNumber(holding.market_value, 2)}</td>
                  <td className={`px-3 py-2 ${holding.unrealized_pnl >= 0 ? "positive" : "negative"}`}>
                    {formatNumber(holding.unrealized_pnl, 2)}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{formatNumber(holding.xirr * 100, 2)}%</td>
                  <td className="px-3 py-2">
                    <button
                      className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-40"
                      disabled={deleteHoldingMutation.isPending}
                      onClick={() => deleteHoldingMutation.mutate(holding.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {healthQuery.data && healthQuery.data.holdings && healthQuery.data.holdings.length > 0 && (
        <Card className="panel-elevated space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg text-white">Advanced Quant & Risk Analysis</h3>
              <p className="muted text-xs">SPY Benchmark 1D Change: <span className={healthQuery.data.benchmark_1d >= 0 ? "positive font-medium" : "negative font-medium"}>{healthQuery.data.benchmark_1d}%</span></p>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Alpha vs SPY (1D)</th>
                  <th className="px-3 py-2">52W Drawdown</th>
                  <th className="px-3 py-2">Volatility (ATR)</th>
                  <th className="px-3 py-2">RSI (14)</th>
                  <th className="px-3 py-2">Technical Posture</th>
                </tr>
              </thead>
              <tbody>
                {healthQuery.data.holdings.map((h: any) => (
                  <tr key={h.symbol} className="border-t border-slate-700/45">
                    <td className="px-3 py-2 font-medium text-slate-100">{h.symbol}</td>
                    <td className={`px-3 py-2 font-medium ${h.outperformance_vs_spy >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {h.outperformance_vs_spy > 0 ? "+" : ""}{h.outperformance_vs_spy}%
                    </td>
                    <td className="px-3 py-2 text-rose-300">
                      {(h.drawdown_52w_high < 0 ? h.drawdown_52w_high : 0)}%
                    </td>
                    <td className="px-3 py-2 text-slate-300">{h.volatility_atr}</td>
                    <td className="px-3 py-2 text-slate-300">{h.rsi_14}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${h.technical_posture.includes("Bullish") ? "bg-emerald-500/10 text-emerald-400" : h.technical_posture.includes("Bearish") ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400"}`}>
                        {h.technical_posture}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <Card className="space-y-1">
    <p className="label-eyebrow">{label}</p>
    <p className="font-mono text-xl text-foreground">{value}</p>
  </Card>
);

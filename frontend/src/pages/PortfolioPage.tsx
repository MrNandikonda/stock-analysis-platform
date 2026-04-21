import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

  const holdingsQuery = useQuery({
    queryKey: ["portfolio"],
    queryFn: api.getPortfolio,
  });
  const summaryQuery = useQuery({
    queryKey: ["portfolio-summary"],
    queryFn: api.getPortfolioSummary,
  });

  const addHoldingMutation = useMutation({
    mutationFn: api.addPortfolioHolding,
    onSuccess: () => {
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
            Save Holding
          </Button>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <Card className="space-y-1">
    <p className="label-eyebrow">{label}</p>
    <p className="font-mono text-xl text-foreground">{value}</p>
  </Card>
);

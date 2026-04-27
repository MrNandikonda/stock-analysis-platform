import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, type CandlestickData, type IChartApi, type Time } from "lightweight-charts";

import { Card } from "@/components/ui/card";
import type { PriceHistoryItem } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

type IndicatorSnapshot = {
  sma50: number | null;
  ema20: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  stochastic: number | null;
  support: number | null;
  resistance: number | null;
};

type CandlestickPanelProps = {
  symbol: string;
  rows: PriceHistoryItem[];
};

const DEFAULT_INDICATORS: IndicatorSnapshot = {
  sma50: null,
  ema20: null,
  rsi14: null,
  macd: null,
  macdSignal: null,
  stochastic: null,
  support: null,
  resistance: null,
};

export const CandlestickPanel = ({ symbol, rows }: CandlestickPanelProps) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const [indicators, setIndicators] = useState<IndicatorSnapshot>(DEFAULT_INDICATORS);

  const candleData = useMemo(
    () =>
      rows.map((row) => ({
        time: Math.floor(new Date(row.date).getTime() / 1000) as Time,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
      })) as CandlestickData[],
    [rows],
  );

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = createChart(chartRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#334155",
        fontFamily: "IBM Plex Sans",
      },
      grid: {
        vertLines: { color: "rgba(124,58,237,0.12)" },
        horzLines: { color: "rgba(6,182,212,0.12)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148,163,184,0.25)",
      },
      timeScale: {
        borderColor: "rgba(148,163,184,0.25)",
      },
      width: chartRef.current.clientWidth,
      height: 380,
    });
    chartInstance.current = chart;
    const candles = chart.addCandlestickSeries({
      upColor: "#27c48f",
      downColor: "#ff6a3d",
      borderUpColor: "#27c48f",
      borderDownColor: "#ff6a3d",
      wickUpColor: "#27c48f",
      wickDownColor: "#ff6a3d",
    });
    candles.setData(candleData);

    const volumeSeries = chart.addHistogramSeries({
      color: "rgba(14,165,233,0.35)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeries.setData(
      rows.map((row) => ({
        time: Math.floor(new Date(row.date).getTime() / 1000) as Time,
        value: row.volume,
      })),
    );

    const onResize = () => {
      if (!chartRef.current) return;
      chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [candleData, rows]);

  useEffect(() => {
    if (!rows.length) {
      setIndicators(DEFAULT_INDICATORS);
      return;
    }
    const worker = new Worker(new URL("../workers/indicatorWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<IndicatorSnapshot>) => {
      setIndicators(event.data);
      worker.terminate();
    };
    worker.postMessage({
      rows: rows.map((row) => ({
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      })),
    });
    return () => worker.terminate();
  }, [rows]);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg text-foreground">{symbol} Technical Chart</h3>
        <div className="text-xs text-muted-foreground">Candles + Volume with worker-based indicators</div>
      </div>
      <div ref={chartRef} className="h-[380px] w-full rounded-xl border border-violet-200/80 bg-gradient-to-br from-white via-cyan-50/80 to-fuchsia-50/80 shadow-inner" />
      <div className="grid gap-2 text-xs text-foreground sm:grid-cols-4 lg:grid-cols-8">
        <IndicatorBox label="SMA 50" value={indicators.sma50} />
        <IndicatorBox label="EMA 20" value={indicators.ema20} />
        <IndicatorBox label="RSI 14" value={indicators.rsi14} />
        <IndicatorBox label="MACD" value={indicators.macd} />
        <IndicatorBox label="Signal" value={indicators.macdSignal} />
        <IndicatorBox label="Stochastic" value={indicators.stochastic} />
        <IndicatorBox label="Support" value={indicators.support} />
        <IndicatorBox label="Resistance" value={indicators.resistance} />
      </div>
    </Card>
  );
};

const IndicatorBox = ({ label, value }: { label: string; value: number | null }) => (
  <div className="rounded-lg border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-3 py-2 shadow-sm">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-sm font-semibold text-foreground">{formatNumber(value, 2)}</div>
  </div>
);


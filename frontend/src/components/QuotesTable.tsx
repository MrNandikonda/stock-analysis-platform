import type { QuoteItem } from "@/lib/types";
import { formatCompact, formatNumber } from "@/lib/utils";

type QuotesTableProps = {
  rows: QuoteItem[];
  onSymbolClick?: (symbol: string) => void;
};

export const QuotesTable = ({ rows, onSymbolClick }: QuotesTableProps) => (
  <div className="overflow-hidden rounded-[1.35rem] border border-violet-200/80 bg-white/85 shadow-panel backdrop-blur-xl">
    <div className="max-h-[500px] overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 text-white shadow-md backdrop-blur">
          <tr className="text-left text-xs uppercase tracking-[0.16em] text-white/85">
            <th className="px-3 py-3">Symbol</th>
            <th className="px-3 py-3">Exchange</th>
            <th className="px-3 py-3">Price</th>
            <th className="px-3 py-3">1D</th>
            <th className="px-3 py-3">1M</th>
            <th className="px-3 py-3">Volume</th>
            <th className="px-3 py-3">P/E</th>
            <th className="px-3 py-3">RSI</th>
            <th className="px-3 py-3">PCR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const displayCurrency = row.exchange === "NSE" ? "INR" : "USD";
            return (
              <tr key={`${row.symbol}-${row.exchange}`} className="border-t border-violet-100/80 bg-white/55 transition odd:bg-violet-50/70 hover:bg-cyan-50/80">
                <td className="px-3 py-3">
                  <button
                    className="rounded-lg px-2 py-1 font-semibold text-cyan-600 transition hover:bg-cyan-100 hover:text-violet-700"
                    onClick={() => onSymbolClick?.(row.symbol)}
                  >
                    {row.symbol}
                  </button>
                </td>
                <td className="px-3 py-3 text-slate-700">{row.exchange}</td>
                <td className="px-3 py-3 font-semibold text-slate-900">
                  {formatNumber(row.price, 2)} {displayCurrency}
                </td>
                <td className={`px-3 py-3 ${(row.change_1d ?? 0) >= 0 ? "positive" : "negative"}`}>
                  {formatNumber(row.change_1d, 2)}%
                </td>
                <td className={`px-3 py-3 ${(row.change_1m ?? 0) >= 0 ? "positive" : "negative"}`}>
                  {formatNumber(row.change_1m, 2)}%
                </td>
                <td className="px-3 py-3 text-slate-700">{formatCompact(row.volume)}</td>
                <td className="px-3 py-3 text-slate-700">{formatNumber(row.pe, 2)}</td>
                <td className="px-3 py-3 text-slate-700">{formatNumber(row.rsi_14, 1)}</td>
                <td className="px-3 py-3 text-slate-700">{formatNumber(row.pcr, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

import type { QuoteItem } from "@/lib/types";
import { formatCompact, formatNumber } from "@/lib/utils";

type QuotesTableProps = {
  rows: QuoteItem[];
  onSymbolClick?: (symbol: string) => void;
  currency?: "INR" | "USD";
};

const INR_PER_USD = 83.2;

export const QuotesTable = ({ rows, onSymbolClick, currency = "USD" }: QuotesTableProps) => (
  <div className="overflow-hidden rounded-[1.35rem] border border-slate-300/15 bg-slate-950/55 shadow-inner">
    <div className="max-h-[500px] overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-950/95 backdrop-blur">
          <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
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
            const convertedPrice = currency === "INR" && row.exchange !== "NSE" ? row.price * INR_PER_USD : row.price;
            return (
              <tr key={`${row.symbol}-${row.exchange}`} className="border-t border-slate-800/80 transition hover:bg-aqua/5">
                <td className="px-3 py-3">
                  <button
                    className="rounded-lg px-2 py-1 font-semibold text-aqua transition hover:bg-aqua/10 hover:text-cyan-200"
                    onClick={() => onSymbolClick?.(row.symbol)}
                  >
                    {row.symbol}
                  </button>
                </td>
                <td className="px-3 py-3 text-slate-300">{row.exchange}</td>
                <td className="px-3 py-3 text-slate-100">
                  {formatNumber(convertedPrice, 2)} {currency === "INR" && row.exchange !== "NSE" ? "INR" : "USD"}
                </td>
                <td className={`px-3 py-3 ${(row.change_1d ?? 0) >= 0 ? "positive" : "negative"}`}>
                  {formatNumber(row.change_1d, 2)}%
                </td>
                <td className={`px-3 py-3 ${(row.change_1m ?? 0) >= 0 ? "positive" : "negative"}`}>
                  {formatNumber(row.change_1m, 2)}%
                </td>
                <td className="px-3 py-3 text-slate-300">{formatCompact(row.volume)}</td>
                <td className="px-3 py-3 text-slate-300">{formatNumber(row.pe, 2)}</td>
                <td className="px-3 py-3 text-slate-300">{formatNumber(row.rsi_14, 1)}</td>
                <td className="px-3 py-3 text-slate-300">{formatNumber(row.pcr, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

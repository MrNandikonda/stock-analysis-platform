import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";

export const PositionEntryModal = ({
  symbol,
  onClose,
}: {
  symbol: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("10");
  const [avgPrice, setAvgPrice] = useState("100");
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [assetClass, setAssetClass] = useState("equity");

  const addHoldingMutation = useMutation({
    mutationFn: api.addPortfolioHolding,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      void queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 transition"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="text-violet-600" size={24} />
          <h2 className="font-display text-xl text-slate-900">Add to Portfolio: {symbol}</h2>
        </div>
        <p className="text-xs text-slate-600 mb-5">Convert this watched stock into a tracked position in your portfolio.</p>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase">Quantity (Shares)</label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase">Average Purchase Price</label>
            <Input value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} type="number" step="0.01" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase">Buy Date</label>
            <Input value={buyDate} onChange={(e) => setBuyDate(e.target.value)} type="date" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase">Asset Class</label>
            <Select value={assetClass} onChange={(e) => setAssetClass(e.target.value)}>
              <option value="equity">Equity</option>
              <option value="etf">ETF</option>
              <option value="f&o">Options (F&O)</option>
            </Select>
          </div>
          
          <Button
            className="w-full mt-4"
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
            {addHoldingMutation.isPending ? "Adding..." : "Confirm Position"}
          </Button>
          {addHoldingMutation.isError && (
            <p className="text-xs text-red-500 text-center mt-2">Failed to add holding.</p>
          )}
        </div>
      </div>
    </div>
  );
};

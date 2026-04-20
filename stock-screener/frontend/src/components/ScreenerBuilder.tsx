import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ScreenerFilter } from "@/lib/types";

const FILTER_FIELDS = [
  "price",
  "change_1d",
  "change_1m",
  "volume_spike",
  "pe",
  "pb",
  "roe",
  "debt_equity",
  "dividend_yield",
  "rsi_14",
  "macd",
  "macd_signal",
  "sma_50",
  "sma_200",
  "oi_change",
  "pcr",
  "iv",
  "asset_type",
  "sector",
  "symbol",
];

const FILTER_OPERATORS = [
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "between",
  "contains",
  "in",
  "gt_field",
  "lt_field",
];

type ScreenerBuilderProps = {
  filters: ScreenerFilter[];
  onChange: (filters: ScreenerFilter[]) => void;
};

export const ScreenerBuilder = ({ filters, onChange }: ScreenerBuilderProps) => {
  const update = (index: number, key: keyof ScreenerFilter, value: string) => {
    const next = [...filters];
    next[index] = {
      ...next[index],
      [key]: key === "value" ? parseFilterValue(next[index].operator, value) : value,
    };
    onChange(next);
  };

  const addFilter = () => {
    onChange([
      ...filters,
      {
        field: "price",
        operator: "gt",
        value: 0,
      },
    ]);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="space-y-3">
      {filters.map((filter, index) => (
        <div key={`${filter.field}-${index}`} className="grid gap-2 rounded-xl border border-slate-500/25 bg-slate-900/45 p-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <Select value={filter.field} onChange={(event) => update(index, "field", event.target.value)}>
              {FILTER_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Select value={filter.operator} onChange={(event) => update(index, "operator", event.target.value)}>
              {FILTER_OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-6">
            <Input
              value={Array.isArray(filter.value) ? filter.value.join(",") : String(filter.value)}
              placeholder="Value or comma-separated values"
              onChange={(event) => update(index, "value", event.target.value)}
            />
          </div>
          <div className="flex items-center justify-end sm:col-span-1">
            <Button variant="ghost" onClick={() => removeFilter(index)}>
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" className="gap-2 text-sm" onClick={addFilter}>
        <Plus size={15} />
        Add Filter
      </Button>
    </div>
  );
};

const parseFilterValue = (operator: string, rawValue: string): string | number | (number | string)[] => {
  if (operator === "between" || operator === "in") {
    return rawValue
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const asNumber = Number(part);
        return Number.isFinite(asNumber) ? asNumber : part;
      });
  }
  if (operator === "gt_field" || operator === "lt_field" || operator === "contains") {
    return rawValue.trim();
  }
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : rawValue.trim();
};

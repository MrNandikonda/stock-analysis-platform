import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";

import { QuotesTable } from "@/components/QuotesTable";
import { ScreenerBuilder } from "@/components/ScreenerBuilder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/lib/api";
import type { LogicOperator, ScreenerFilter, ScreenerQueryPayload } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const DEFAULT_FILTERS: ScreenerFilter[] = [{ field: "price", operator: "gt", value: 0 }];

export const ScreenerPage = () => {
  const queryClient = useQueryClient();
  const { market, currency, setSelectedSymbol } = useAppStore();

  const [logic, setLogic] = useState<LogicOperator>("AND");
  const [filters, setFilters] = useState<ScreenerFilter[]>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState("change_1d");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const requestPayload = useMemo<ScreenerQueryPayload>(
    () => ({
      market,
      logic,
      filters,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: 1,
      page_size: 50,
    }),
    [market, logic, filters, sortBy, sortOrder],
  );
  const debouncedPayload = useDebouncedValue(requestPayload, 500);

  const screenerQuery = useQuery({
    queryKey: ["screener", debouncedPayload],
    queryFn: () => api.runScreener(debouncedPayload),
    placeholderData: (previousData) => previousData,
  });

  const presetsQuery = useQuery({
    queryKey: ["screener-presets"],
    queryFn: api.getScreenerPresets,
  });

  const savePresetMutation = useMutation({
    mutationFn: ({ name, query }: { name: string; query: ScreenerQueryPayload }) =>
      api.saveScreenerPreset(name, query),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["screener-presets"] });
    },
  });

  const loadPreset = (presetId: string) => {
    const selected = presetsQuery.data?.find((preset) => String(preset.id) === presetId);
    if (!selected) return;
    setLogic(selected.query.logic);
    setFilters(selected.query.filters);
    setSortBy(selected.query.sort_by);
    setSortOrder(selected.query.sort_order);
  };

  const saveCurrentPreset = () => {
    const name = window.prompt("Preset name");
    if (!name) return;
    savePresetMutation.mutate({
      name,
      query: requestPayload,
    });
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-white">Screener Filters</h2>
            <p className="muted text-xs">Server-side filtered, debounced at 500ms with pagination batch size of 50.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select className="w-[180px]" onChange={(event) => loadPreset(event.target.value)} defaultValue="">
              <option value="">Load Preset</option>
              {(presetsQuery.data ?? []).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </Select>
            <Button variant="outline" className="gap-2" onClick={saveCurrentPreset}>
              <Save size={14} />
              Save Preset
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={logic} onChange={(event) => setLogic(event.target.value as LogicOperator)}>
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </Select>
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="change_1d">change_1d</option>
            <option value="change_1m">change_1m</option>
            <option value="volume_spike">volume_spike</option>
            <option value="pe">pe</option>
            <option value="roe">roe</option>
            <option value="updated_at">updated_at</option>
          </Select>
          <Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}>
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </Select>
        </div>
        <ScreenerBuilder filters={filters} onChange={setFilters} />
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-white">Screener Results</h3>
          <Badge tone="neutral">
            {screenerQuery.isFetching ? "Refreshing..." : `${screenerQuery.data?.total ?? 0} matches`}
          </Badge>
        </div>
        <QuotesTable rows={screenerQuery.data?.items ?? []} currency={currency} onSymbolClick={setSelectedSymbol} />
      </Card>
    </div>
  );
};

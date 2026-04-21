import { Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MarketStatusResponse } from "@/lib/types";

type MarketStatusPanelProps = {
  status?: MarketStatusResponse;
};

export const MarketStatusPanel = ({ status }: MarketStatusPanelProps) => {
  if (!status) {
    return (
      <Card className="min-h-32 animate-pulse">
        <div className="h-full rounded-xl bg-slate-800/40" />
      </Card>
    );
  }

  return (
    <Card className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-[1.35rem] border border-slate-300/15 bg-slate-950/35 p-4 transition hover:border-aqua/25">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base text-white">NSE session</h3>
          <Badge tone={status.nse.is_open ? "positive" : "negative"}>
            {status.nse.is_open ? "Open" : "Closed"}
          </Badge>
        </div>
        <p className="muted text-sm">Session: {status.nse.session} IST</p>
        <p className="muted mt-1 text-sm">Local Time: {new Date(status.nse.local_time).toLocaleTimeString()}</p>
      </section>
      <section className="rounded-[1.35rem] border border-slate-300/15 bg-slate-950/35 p-4 transition hover:border-aqua/25">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-base text-white">NYSE / NASDAQ</h3>
          <Badge tone={status.nyse.is_open ? "positive" : "negative"}>
            {status.nyse.is_open ? "Open" : "Closed"}
          </Badge>
        </div>
        <p className="muted text-sm">Regular: {status.nyse.session} ET</p>
        <p className="muted text-sm">Pre: {status.nyse.pre_market} | Post: {status.nyse.post_market}</p>
        <p className="muted mt-1 flex items-center gap-1 text-sm">
          <Clock3 size={14} />
          {new Date(status.nyse.local_time).toLocaleTimeString()}
        </p>
      </section>
    </Card>
  );
};

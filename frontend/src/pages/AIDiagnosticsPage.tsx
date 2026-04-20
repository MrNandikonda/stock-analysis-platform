import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const AIDiagnosticsPage = () => {
  const statusQuery = useQuery({
    queryKey: ["ai-status"],
    queryFn: api.getAIStatus,
    refetchInterval: 60_000,
  });

  const diagnosticsQuery = useQuery({
    queryKey: ["ai-diagnostics"],
    queryFn: api.getAIDiagnostics,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-white">AI Control Plane</h2>
            <p className="muted text-xs">Provider readiness, job health, and safety guardrails.</p>
          </div>
          <Badge tone={statusQuery.data?.ai_analysis_enabled ? "positive" : "neutral"}>
            {statusQuery.data?.ai_analysis_enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <p className="text-sm text-slate-200">{diagnosticsQuery.data?.admin_summary ?? "Loading diagnostics..."}</p>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        {(statusQuery.data?.providers ?? []).map((provider) => (
          <Card key={provider.provider_name} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base text-white">{provider.provider_name}</h3>
              <Badge tone={provider.ready ? "positive" : "neutral"}>{provider.status}</Badge>
            </div>
            <p className="text-sm text-slate-200">{provider.message}</p>
            <div className="grid gap-1 text-xs text-slate-300">
              <span>Orchestrator: {provider.model_orchestrator ?? "-"}</span>
              <span>Specialist: {provider.model_specialist ?? "-"}</span>
              <span>Summarizer: {provider.model_summarizer ?? "-"}</span>
              <span>Tools: {provider.supports_tool_calling ? "Yes" : "No"}</span>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base text-white">Recent Jobs</h3>
            <Badge>{diagnosticsQuery.data?.recent_jobs.length ?? 0}</Badge>
          </div>
          <div className="space-y-2">
            {(diagnosticsQuery.data?.recent_jobs ?? []).map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-500/20 bg-slate-900/35 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">Job #{job.id}</span>
                  <Badge tone={job.status === "completed" ? "positive" : "neutral"}>{job.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Watchlist {job.watchlist_id} | {job.processed_symbols}/{job.total_symbols} processed
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(job.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3">
            <h3 className="font-display text-base text-white">Failure Watch</h3>
            <div className="space-y-2 text-sm text-slate-200">
              {(diagnosticsQuery.data?.recent_failures ?? []).map((job) => (
                <div key={job.id} className="rounded-lg bg-slate-900/35 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span>Job #{job.id}</span>
                    <span className="negative">{job.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{job.error_message ?? "No error message recorded."}</p>
                </div>
              ))}
              {!diagnosticsQuery.data?.recent_failures.length && <p className="muted text-xs">No recent failures recorded.</p>}
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-display text-base text-white">Resource Snapshot</h3>
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Average run duration: {formatNumber(diagnosticsQuery.data?.average_run_duration_ms, 0)} ms</span>
              <span>Input tokens: {formatNumber(diagnosticsQuery.data?.token_summary.input_tokens, 0)}</span>
              <span>Output tokens: {formatNumber(diagnosticsQuery.data?.token_summary.output_tokens, 0)}</span>
              <span>Stale analyses: {formatNumber(diagnosticsQuery.data?.source_health.stale_analysis_count, 0)}</span>
              <span>Expired analyses: {formatNumber(diagnosticsQuery.data?.source_health.expired_analysis_count, 0)}</span>
              <span>Write tools for specialists: {diagnosticsQuery.data?.safety_mode.write_tools_enabled_for_specialists ? "Enabled" : "Disabled"}</span>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

import { useState } from "react";
import { BarChart2, BookOpen } from "lucide-react";
import { WatchlistSidebar } from "@/components/WatchlistSidebar";
import { ReportViewer } from "@/components/ReportViewer";

export default function DeskPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NVDA");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top nav bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-hero">
            <BarChart2 size={16} className="text-primary-foreground" />
          </div>
          <div>
            <span className="font-display text-base font-semibold text-foreground">Retail Intelligence Desk</span>
            <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Paper Trading · Research Only</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpen size={13} />
            <span className="font-sans text-xs">5 Agents Active</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <div className="flex items-center gap-1.5 rounded-full border border-bull/20 bg-bull-soft px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-bull animate-pulse" />
            <span className="font-sans text-[11px] font-semibold text-bull">MOCK</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <WatchlistSidebar selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />
        <ReportViewer symbol={selectedSymbol} />
      </div>
    </div>
  );
}

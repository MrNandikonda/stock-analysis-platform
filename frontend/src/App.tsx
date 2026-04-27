import { lazy, Suspense, useState } from "react";

import { AppShell, type AppTab } from "@/components/AppShell";
import { useAlertNotifications } from "@/hooks/useAlertNotifications";
import { DashboardPage } from "@/pages/DashboardPage";

const ChartsPage = lazy(() => import("@/pages/ChartsPage").then((m) => ({ default: m.ChartsPage })));
const NewsPage = lazy(() => import("@/pages/NewsPage").then((m) => ({ default: m.NewsPage })));
const PortfolioPage = lazy(() => import("@/pages/PortfolioPage").then((m) => ({ default: m.PortfolioPage })));
const AIDiagnosticsPage = lazy(() => import("@/pages/AIDiagnosticsPage").then((m) => ({ default: m.AIDiagnosticsPage })));
const ScreenerPage = lazy(() => import("@/pages/ScreenerPage").then((m) => ({ default: m.ScreenerPage })));
const WatchlistsPage = lazy(() => import("@/pages/WatchlistsPage").then((m) => ({ default: m.WatchlistsPage })));
const RetailDeskPage = lazy(() => import("@/pages/RetailDeskPage").then((m) => ({ default: m.RetailDeskPage })));

const renderTab = (tab: AppTab, openChart: () => void) => {
  switch (tab) {
    case "dashboard":
      return <DashboardPage onOpenChart={openChart} />;
    case "screener":
      return <ScreenerPage />;
    case "charts":
      return <ChartsPage />;
    case "watchlists":
      return <WatchlistsPage />;
    case "portfolio":
      return <PortfolioPage />;
    case "news":
      return <NewsPage />;
    case "desk":
      return <RetailDeskPage />;
    case "diagnostics":
      return <AIDiagnosticsPage />;
    default:
      return <DashboardPage />;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  useAlertNotifications();

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      <Suspense
        fallback={<ModuleFallback />}
      >
        {renderTab(activeTab, () => setActiveTab("charts"))}
      </Suspense>
    </AppShell>
  );
}

const ModuleFallback = () => (
  <div className="space-y-4 p-1" aria-live="polite" aria-busy="true">
    <div className="panel-elevated grid gap-4 p-5 md:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-3">
        <div className="h-3 w-32 animate-pulse rounded-full bg-violet-200" />
        <div className="h-8 w-2/3 animate-pulse rounded-full bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200" />
        <div className="h-3 w-full animate-pulse rounded-full bg-cyan-100" />
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-fuchsia-100" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-2xl border border-violet-100 bg-white/70" />
        ))}
      </div>
    </div>
    <p className="text-center text-xs text-muted-foreground">Loading workspace module…</p>
  </div>
);

export default App;

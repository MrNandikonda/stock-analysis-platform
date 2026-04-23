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

const renderTab = (tab: AppTab) => {
  switch (tab) {
    case "dashboard":
      return <DashboardPage />;
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
        fallback={<div className="flex h-full items-center justify-center p-8 text-sm text-gray-500">Loading module...</div>}
      >
        {renderTab(activeTab)}
      </Suspense>
    </AppShell>
  );
}

export default App;

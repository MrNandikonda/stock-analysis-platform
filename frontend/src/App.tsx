import { useState } from "react";

import { AppShell, type AppTab } from "@/components/AppShell";
import { useAlertNotifications } from "@/hooks/useAlertNotifications";
import { ChartsPage } from "@/pages/ChartsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewsPage } from "@/pages/NewsPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { AIDiagnosticsPage } from "@/pages/AIDiagnosticsPage";
import { ScreenerPage } from "@/pages/ScreenerPage";
import { WatchlistsPage } from "@/pages/WatchlistsPage";

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

  return <AppShell activeTab={activeTab} onTabChange={setActiveTab}>{renderTab(activeTab)}</AppShell>;
}

export default App;

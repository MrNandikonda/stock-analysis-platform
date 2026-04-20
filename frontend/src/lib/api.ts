import type {
  Market,
  MarketStatusResponse,
  NewsItem,
  EarningsEvent,
  OptionsChain,
  PortfolioHolding,
  PortfolioSummary,
  AIDiagnosticsResponse,
  AIAnalysisListItem,
  AIRunJobResponse,
  AIStatusResponse,
  AIStockAnalysisDetail,
  AIWatchlistSettings,
  AIWatchlistSummary,
  PresetItem,
  PriceHistoryItem,
  QuotesResponse,
  ScreenerQueryPayload,
  Watchlist,
} from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export const api = {
  getMarketStatus: () => request<MarketStatusResponse>("/market/status"),
  getQuotes: (market: Market, page = 1, pageSize = 50) =>
    request<QuotesResponse>(`/market/quotes?market=${market}&page=${page}&page_size=${pageSize}`),
  refreshMarketData: (limit = 120) =>
    request<{ updated: number }>(`/market/refresh?limit=${limit}`, { method: "POST" }),
  getPriceHistory: (symbol: string, period = "1y", interval = "1d") =>
    request<PriceHistoryItem[]>(
      `/market/history/${symbol}?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`,
    ),
  getOptionsChain: (symbol: string, exchange: string) =>
    request<OptionsChain>(`/market/options/${symbol}?exchange=${exchange}`),
  runScreener: (payload: ScreenerQueryPayload) =>
    request<QuotesResponse>("/screener/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getScreenerPresets: () => request<PresetItem[]>("/screener/presets"),
  saveScreenerPreset: (name: string, query: ScreenerQueryPayload) =>
    request("/screener/presets", {
      method: "POST",
      body: JSON.stringify({ name, query }),
    }),
  deleteScreenerPreset: (presetId: number) =>
    request(`/screener/presets/${presetId}`, { method: "DELETE" }),
  getWatchlists: () => request<Watchlist[]>("/watchlists"),
  createWatchlist: (name: string) =>
    request("/watchlists", { method: "POST", body: JSON.stringify({ name }) }),
  addWatchlistItems: (watchlistId: number, symbols: string[]) =>
    request(`/watchlists/${watchlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ symbols }),
    }),
  importWatchlistCsv: (watchlistId: number, csvData: string) =>
    request(`/watchlists/${watchlistId}/import-csv`, {
      method: "POST",
      body: JSON.stringify({ csv_data: csvData }),
    }),
  createAlert: (symbol: string, condition: string, targetValue: number) =>
    request("/watchlists/alerts", {
      method: "POST",
      body: JSON.stringify({ symbol, condition, target_value: targetValue }),
    }),
  evaluateAlerts: () => request<{ triggered: Array<Record<string, string | number>> }>("/watchlists/alerts/check", { method: "POST" }),
  getPortfolio: () => request<PortfolioHolding[]>("/portfolio"),
  getPortfolioSummary: () => request<PortfolioSummary>("/portfolio/summary"),
  addPortfolioHolding: (payload: {
    symbol: string;
    quantity: number;
    avg_price: number;
    buy_date: string;
    asset_class: string;
  }) =>
    request("/portfolio", { method: "POST", body: JSON.stringify(payload) }),
  importPortfolioCsv: (csvData: string) =>
    request("/portfolio/import-csv", { method: "POST", body: JSON.stringify({ csv_data: csvData }) }),
  getNews: (symbols?: string, limit = 30) =>
    request<NewsItem[]>(`/news?limit=${limit}${symbols ? `&symbols=${encodeURIComponent(symbols)}` : ""}`),
  getEarningsCalendar: (symbols?: string) =>
    request<EarningsEvent[]>(`/news/earnings-calendar${symbols ? `?symbols=${encodeURIComponent(symbols)}` : ""}`),
  getAIStatus: () => request<AIStatusResponse>("/ai/status"),
  getAIWatchlistSettings: (watchlistId: number) => request<AIWatchlistSettings>(`/ai/watchlists/${watchlistId}/settings`),
  updateAIWatchlistSettings: (watchlistId: number, payload: AIWatchlistSettings) =>
    request(`/ai/watchlists/${watchlistId}/settings`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  runAIWatchlistAnalysis: (watchlistId: number, force = false) =>
    request<AIRunJobResponse>(`/ai/watchlists/${watchlistId}/run`, {
      method: "POST",
      body: JSON.stringify({ force }),
    }),
  getAIWatchlistSummary: (watchlistId: number) => request<AIWatchlistSummary>(`/ai/watchlists/${watchlistId}/summary`),
  getAIWatchlistAnalyses: (watchlistId: number) =>
    request<AIAnalysisListItem[]>(`/ai/watchlists/${watchlistId}/analyses`),
  getAIStockAnalysisDetail: (watchlistId: number, symbol: string) =>
    request<AIStockAnalysisDetail>(`/ai/watchlists/${watchlistId}/analyses/${encodeURIComponent(symbol)}`),
  getAIDiagnostics: () => request<AIDiagnosticsResponse>("/ai/diagnostics"),
};

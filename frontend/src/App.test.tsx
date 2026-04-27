import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {}

  close() {}
}

const jsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.stubGlobal("EventSource", MockEventSource);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/market/quotes")) {
        return jsonResponse({ items: [], total: 0, page: 1, page_size: 50 });
      }
      if (url.includes("/market/status")) {
        const now = new Date().toISOString();
        return jsonResponse({
          nse: { is_open: false, session: "Closed", local_time: now },
          nyse: { is_open: false, session: "Closed", pre_market: "Closed", post_market: "Closed", local_time: now },
        });
      }
      if (url.includes("/watchlists/alerts/check")) {
        return jsonResponse({ triggered: [] });
      }
      if (url.includes("/watchlists")) {
        return jsonResponse([]);
      }
      if (url.includes("/ai/status")) {
        return jsonResponse({ ai_analysis_enabled: false, providers: [] });
      }
      return jsonResponse({});
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
};

describe("App Component UI", () => {
  it("renders the main app shell", () => {
    renderApp();
    expect(screen.getAllByText(/RythuMarket/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
  });
});

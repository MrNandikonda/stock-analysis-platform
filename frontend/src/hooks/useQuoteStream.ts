import { useEffect, useState } from "react";

import type { Market, QuoteItem } from "@/lib/types";

type StreamPayload = {
  items: QuoteItem[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const buildStreamUrl = (market: Market) => {
  const url = new URL(`${API_BASE}/market/stream`, window.location.origin);
  url.searchParams.set("market", market);
  return url.toString();
};

export const useQuoteStream = (market: Market) => {
  const [streamedQuotes, setStreamedQuotes] = useState<QuoteItem[] | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource(buildStreamUrl(market));
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as StreamPayload;
        setStreamedQuotes(payload.items ?? []);
        setStreamError(null);
      } catch (error) {
        setStreamError((error as Error).message);
      }
    };
    source.onerror = () => {
      setStreamError("Live stream unavailable. Falling back to polling.");
      source.close();
    };

    return () => source.close();
  }, [market]);

  return { streamedQuotes, streamError };
};


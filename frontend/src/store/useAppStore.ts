import { create } from "zustand";

import type { Currency, Market } from "@/lib/types";

type AppState = {
  market: Market;
  currency: Currency;
  selectedSymbol: string;
  setMarket: (market: Market) => void;
  setCurrency: (currency: Currency) => void;
  setSelectedSymbol: (symbol: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  market: "ALL",
  currency: "USD",
  selectedSymbol: "RELIANCE",
  setMarket: (market) => set({ market }),
  setCurrency: (currency) => set({ currency }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol.toUpperCase() }),
}));


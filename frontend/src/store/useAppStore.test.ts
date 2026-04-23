import { act, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useAppStore } from "./useAppStore";

describe("useAppStore", () => {
  it("initializes with default state", () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.market).toBe("ALL");
    expect(result.current.currency).toBe("USD");
    expect(result.current.selectedSymbol).toBe("RELIANCE");
  });

  it("updates market correctly", () => {
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setMarket("US");
    });
    expect(result.current.market).toBe("US");
  });

  it("updates selectedSymbol and formats it to uppercase", () => {
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setSelectedSymbol("aapl");
    });
    expect(result.current.selectedSymbol).toBe("AAPL");
  });
});
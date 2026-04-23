import { describe, it, expect, vi, beforeEach } from "vitest";
import "./indicatorWorker"; // This executes the worker and binds self.onmessage

describe("Indicator Worker", () => {
  beforeEach(() => {
    // Mock the worker's postMessage API to capture the payload
    self.postMessage = vi.fn();
  });

  it("handles empty data gracefully, returning nulls", () => {
    // Simulate incoming worker message with empty rows
    self.onmessage?.({ data: { rows: [] } } as MessageEvent);

    expect(self.postMessage).toHaveBeenCalledWith({
      sma50: null,
      ema20: null,
      rsi14: null,
      macd: null,
      macdSignal: null,
      stochastic: null,
      support: null,
      resistance: null,
    });
  });

  it("computes indicators successfully with sufficient data", () => {
    // Generate 50 simulated OHLCV rows for SMA50 to trigger
    const rows = Array.from({ length: 50 }, (_, i) => ({
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
      volume: 1000,
    }));

    // Simulate incoming worker message
    self.onmessage?.({ data: { rows } } as MessageEvent);

    expect(self.postMessage).toHaveBeenCalled();
    
    // Extract the calculated payload
    const payload = vi.mocked(self.postMessage).mock.calls[0][0];

    expect(payload.sma50).not.toBeNull();
    expect(payload.ema20).not.toBeNull();
    expect(payload.rsi14).not.toBeNull();
    
    // Support and resistance are calculated from the last 40 rows
    expect(payload.support).toBeDefined();
    expect(payload.support).toBeLessThanOrEqual(payload.resistance as number);
    expect(payload.resistance).toBeDefined();
  });
});
type Ohlcv = {
  high: number;
  low: number;
  close: number;
  volume: number;
};

type WorkerInput = {
  rows: Ohlcv[];
};

type WorkerOutput = {
  sma50: number | null;
  ema20: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  stochastic: number | null;
  support: number | null;
  resistance: number | null;
};

const sma = (values: number[], period: number): number | null => {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((acc, value) => acc + value, 0) / period;
};

const ema = (values: number[], period: number): number | null => {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((acc, value) => acc + value, 0) / period;
  for (const value of values.slice(period)) {
    result = value * k + result * (1 - k);
  }
  return result;
};

const rsi = (values: number[], period = 14): number | null => {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta > 0) gains += delta;
    if (delta < 0) losses -= delta;
  }
  if (losses === 0) return 100;
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const macd = (values: number[]) => {
  const macdValue = (() => {
    const fast = ema(values, 12);
    const slow = ema(values, 26);
    if (fast === null || slow === null) return null;
    return fast - slow;
  })();
  if (macdValue === null) {
    return { macd: null, signal: null };
  }

  const macdSeries: number[] = [];
  for (let index = 26; index <= values.length; index += 1) {
    const subSeries = values.slice(0, index);
    const fast = ema(subSeries, 12);
    const slow = ema(subSeries, 26);
    if (fast !== null && slow !== null) macdSeries.push(fast - slow);
  }
  return { macd: macdValue, signal: ema(macdSeries, 9) };
};

const stochastic = (rows: Ohlcv[], period = 14): number | null => {
  if (rows.length < period) return null;
  const slice = rows.slice(-period);
  const highest = Math.max(...slice.map((row) => row.high));
  const lowest = Math.min(...slice.map((row) => row.low));
  const close = slice[slice.length - 1]?.close ?? 0;
  if (highest === lowest) return null;
  return ((close - lowest) / (highest - lowest)) * 100;
};

const supportResistance = (rows: Ohlcv[]) => {
  if (!rows.length) {
    return { support: null, resistance: null };
  }
  const lookback = rows.slice(-40);
  return {
    support: Math.min(...lookback.map((row) => row.low)),
    resistance: Math.max(...lookback.map((row) => row.high)),
  };
};

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const rows = event.data.rows ?? [];
  const closes = rows.map((row) => row.close);
  const macdValue = macd(closes);
  const sr = supportResistance(rows);
  const payload: WorkerOutput = {
    sma50: sma(closes, 50),
    ema20: ema(closes, 20),
    rsi14: rsi(closes, 14),
    macd: macdValue.macd,
    macdSignal: macdValue.signal,
    stochastic: stochastic(rows, 14),
    support: sr.support,
    resistance: sr.resistance,
  };
  self.postMessage(payload);
};

export {};


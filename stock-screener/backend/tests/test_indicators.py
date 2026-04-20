from app.services.indicators import bollinger_bands, ema, macd, rsi, sma, stochastic


def test_sma():
    values = [1, 2, 3, 4, 5]
    assert sma(values, 5) == 3
    assert sma(values, 6) is None


def test_ema():
    values = [10, 11, 12, 13, 14, 15]
    result = ema(values, 3)
    assert result is not None
    assert result > 0


def test_rsi_range():
    values = [10, 10.5, 11, 10.9, 11.2, 11.5, 11.4, 11.8, 12.0, 12.2, 12.1, 12.5, 12.8, 13.0, 13.4]
    result = rsi(values, 14)
    assert result is not None
    assert 0 <= result <= 100


def test_macd_result():
    values = [100 + idx * 0.8 for idx in range(60)]
    macd_value, signal = macd(values)
    assert macd_value is not None
    assert signal is not None


def test_bollinger_and_stochastic():
    closes = [100 + idx for idx in range(30)]
    highs = [value + 2 for value in closes]
    lows = [value - 2 for value in closes]
    upper, middle, lower = bollinger_bands(closes, period=20)
    stoch = stochastic(highs, lows, closes, period=14)
    assert upper is not None and middle is not None and lower is not None
    assert stoch is not None
    assert 0 <= stoch <= 100


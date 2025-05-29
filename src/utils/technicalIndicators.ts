
// Technical indicators calculation utilities
export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  RSI_14: number;
  MACD_value: number;
  MACD_signal: number;
  MACD_histogram: number;
  BollingerBands_upper: number;
  BollingerBands_middle: number;
  BollingerBands_lower: number;
  SMA_20: number;
  EMA_12: number;
  EMA_26: number;
}

// Simple Moving Average
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return sum / period;
}

// Exponential Moving Average
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

// RSI (Relative Strength Index)
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // neutral value
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
  
  const avgGain = calculateSMA(gains, period);
  const avgLoss = calculateSMA(losses, period);
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdValue = ema12 - ema26;
  
  // For signal line, we need to calculate EMA of MACD values
  // Simplified version - in real implementation, you'd track MACD history
  const signalLine = macdValue * 0.9; // Simplified signal approximation
  const histogram = macdValue - signalLine;
  
  return {
    value: macdValue,
    signal: signalLine,
    histogram: histogram
  };
}

// Bollinger Bands
export function calculateBollingerBands(
  prices: number[], 
  period: number = 20, 
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number } {
  const sma = calculateSMA(prices, period);
  
  if (prices.length < period) {
    return { upper: sma, middle: sma, lower: sma };
  }
  
  const recentPrices = prices.slice(-period);
  const variance = recentPrices.reduce((acc, price) => {
    return acc + Math.pow(price - sma, 2);
  }, 0) / period;
  
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * stdDevMultiplier),
    middle: sma,
    lower: sma - (stdDev * stdDevMultiplier)
  };
}

// Calculate all technical indicators
export function calculateAllIndicators(candles: CandleData[]): TechnicalIndicators {
  const closePrices = candles.map(candle => candle.close);
  
  const rsi = calculateRSI(closePrices, 14);
  const macd = calculateMACD(closePrices);
  const bollingerBands = calculateBollingerBands(closePrices, 20, 2);
  const sma20 = calculateSMA(closePrices, 20);
  const ema12 = calculateEMA(closePrices, 12);
  const ema26 = calculateEMA(closePrices, 26);
  
  return {
    RSI_14: rsi,
    MACD_value: macd.value,
    MACD_signal: macd.signal,
    MACD_histogram: macd.histogram,
    BollingerBands_upper: bollingerBands.upper,
    BollingerBands_middle: bollingerBands.middle,
    BollingerBands_lower: bollingerBands.lower,
    SMA_20: sma20,
    EMA_12: ema12,
    EMA_26: ema26
  };
}

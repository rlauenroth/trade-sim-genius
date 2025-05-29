// AI Signal type definitions

export interface KuCoinCredentials {
  kucoinApiKey: string;
  kucoinApiSecret: string;
  kucoinApiPassphrase: string;
}

export interface SignalGenerationParams {
  kucoinCredentials: KuCoinCredentials;
  openRouterApiKey: string;
  strategy: string;
  simulatedPortfolioValue: number;
  availableUSDT: number;
  selectedModelId: string; // NEW: User-selected model ID
}

export interface GeneratedSignal {
  assetPair: string;
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  entryPriceSuggestion: string | number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidenceScore?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
  isDemoMode?: boolean;
}

export interface MarketDataPoint {
  pair: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
}

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DetailedMarketData {
  asset_pair: string;
  current_price: number;
  recent_candles: CandleData[];
  price_trend_1h: number;
  price_trend_4h: number;
  volume_average: number;
}

export interface PortfolioData {
  total_simulated_value_usdt: number;
  available_usdt: number;
  strategy: string;
}

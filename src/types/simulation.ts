export interface SimulationState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number;
  startPortfolioValue: number;
  currentPortfolioValue: number;
  realizedPnL: number;
  openPositions: Position[];
  paperAssets: PaperAsset[];
}

export interface Position {
  id: string;
  assetPair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  takeProfit: number;
  stopLoss: number;
  unrealizedPnL: number;
  openTimestamp: number;
}

export interface PaperAsset {
  symbol: string;
  quantity: number;
  entryPrice?: number;
}

export interface Signal {
  assetPair: string;
  signalType: 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';
  entryPriceSuggestion: string | number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidenceScore?: number;
  reasoning?: string;
  suggestedPositionSizePercent?: number;
}

export interface ActivityLogEntry {
  timestamp: number;
  type: 'INFO' | 'AI' | 'TRADE' | 'ERROR' | 'SUCCESS' | 'WARNING';
  message: string;
  source?: string;
}

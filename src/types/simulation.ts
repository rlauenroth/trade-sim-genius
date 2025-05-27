export interface SimulationState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number;
  startPortfolioValue: number;
  currentPortfolioValue: number;
  realizedPnL: number;
  openPositions: Position[];
  paperAssets: PaperAsset[];
  autoMode?: boolean;
  autoTradeCount?: number;
  lastAutoTradeTime?: number;
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
  type: 'INFO' | 'AI' | 'TRADE' | 'ERROR' | 'SUCCESS' | 'WARNING' | 'PORTFOLIO_UPDATE' | 'MARKET_DATA' | 'SYSTEM' | 'PERFORMANCE' | 'API' | 'SIM' | 'SIMULATION' | 'RISK' | 'AUTO_TRADE';
  message: string;
  source?: string;
  details?: {
    signalData?: Signal;
    tradeData?: {
      id: string;
      assetPair: string;
      type: 'BUY' | 'SELL';
      quantity: number;
      price: number;
      fee: number;
      totalValue: number;
      auto?: boolean;
    };
    portfolioData?: {
      valueBefore: number;
      valueAfter: number;
      change: number;
      changePercent: number;
    };
    performanceData?: {
      metric: string;
      value: number;
      unit: string;
    };
    autoMode?: boolean;
  };
  relatedTradeId?: string;
  simulationCycleId?: string;
  meta?: Record<string, any>;
}


export interface StrategyConfig {
  tradeFraction: number;
  minimumMeaningfulTradeSize: number;
  maxOpenPositions: number;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
}

export const STRATEGY_CONFIGS: Record<string, StrategyConfig> = {
  conservative: {
    tradeFraction: 0.05, // 5%
    minimumMeaningfulTradeSize: 100, // USDT
    maxOpenPositions: 2,
    defaultStopLossPercent: -1,
    defaultTakeProfitPercent: 2
  },
  balanced: {
    tradeFraction: 0.10, // 10%
    minimumMeaningfulTradeSize: 75, // USDT
    maxOpenPositions: 4,
    defaultStopLossPercent: -2,
    defaultTakeProfitPercent: 4
  },
  aggressive: {
    tradeFraction: 0.15, // 15%
    minimumMeaningfulTradeSize: 50, // USDT
    maxOpenPositions: 6,
    defaultStopLossPercent: -3,
    defaultTakeProfitPercent: 8
  }
};

export function calcTradeSize(
  portfolioValueUsd: number, 
  availableCash: number,
  strategy: string
): number {
  const strategyKey = strategy.toLowerCase() as keyof typeof STRATEGY_CONFIGS;
  const config = STRATEGY_CONFIGS[strategyKey] || STRATEGY_CONFIGS.balanced;
  
  const ideal = portfolioValueUsd * config.tradeFraction;
  
  if (availableCash < config.minimumMeaningfulTradeSize) {
    return 0; // Trade will be rejected
  }
  
  return Math.min(ideal, availableCash);
}

export function getStrategyConfig(strategy: string): StrategyConfig {
  const strategyKey = strategy.toLowerCase() as keyof typeof STRATEGY_CONFIGS;
  return STRATEGY_CONFIGS[strategyKey] || STRATEGY_CONFIGS.balanced;
}

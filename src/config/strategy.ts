
export interface StrategyConfig {
  tradeFraction: number;
  maxOpenPositions: number;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
}

export const MINIMUM_TRADE_USDT = 10; // New global minimum

export const STRATEGY_CONFIGS: Record<string, StrategyConfig> = {
  conservative: {
    tradeFraction: 0.05, // 5%
    maxOpenPositions: 2,
    defaultStopLossPercent: -1,
    defaultTakeProfitPercent: 2
  },
  balanced: {
    tradeFraction: 0.10, // 10%
    maxOpenPositions: 4,
    defaultStopLossPercent: -2,
    defaultTakeProfitPercent: 4
  },
  aggressive: {
    tradeFraction: 0.15, // 15%
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
  
  const ideal = Math.max(portfolioValueUsd * config.tradeFraction, MINIMUM_TRADE_USDT);
  
  if (availableCash < MINIMUM_TRADE_USDT) {
    return 0; // Trade will be rejected
  }
  
  return Math.min(ideal, availableCash);
}

export function getStrategyConfig(strategy: string): StrategyConfig {
  const strategyKey = strategy.toLowerCase() as keyof typeof STRATEGY_CONFIGS;
  return STRATEGY_CONFIGS[strategyKey] || STRATEGY_CONFIGS.balanced;
}

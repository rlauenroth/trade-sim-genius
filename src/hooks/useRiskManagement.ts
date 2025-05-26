
// Risk management parameters based on trading strategies
interface RiskParameters {
  minimumTradeSize: number; // USDT
  maxOpenPositions: number;
  portfolioDrawdownLimit: number; // Percentage
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
  positionSizePercent: number;
}

interface StrategyConfig {
  conservative: RiskParameters;
  balanced: RiskParameters;
  aggressive: RiskParameters;
}

const STRATEGY_CONFIG: StrategyConfig = {
  conservative: {
    minimumTradeSize: 100,
    maxOpenPositions: 2,
    portfolioDrawdownLimit: -2,
    defaultStopLossPercent: -1,
    defaultTakeProfitPercent: 2,
    positionSizePercent: 2
  },
  balanced: {
    minimumTradeSize: 75,
    maxOpenPositions: 4,
    portfolioDrawdownLimit: -4,
    defaultStopLossPercent: -2,
    defaultTakeProfitPercent: 4,
    positionSizePercent: 5
  },
  aggressive: {
    minimumTradeSize: 50,
    maxOpenPositions: 6,
    portfolioDrawdownLimit: -6,
    defaultStopLossPercent: -3,
    defaultTakeProfitPercent: 8,
    positionSizePercent: 8
  }
};

export const useRiskManagement = (strategy: string) => {
  const getRiskParameters = (): RiskParameters => {
    const strategyKey = strategy.toLowerCase() as keyof StrategyConfig;
    return STRATEGY_CONFIG[strategyKey] || STRATEGY_CONFIG.balanced;
  };

  const checkDrawdownLimit = (
    startValue: number,
    currentValue: number,
    strategy: string
  ): boolean => {
    const params = getRiskParameters();
    const drawdownPercent = ((currentValue - startValue) / startValue) * 100;
    return drawdownPercent <= params.portfolioDrawdownLimit;
  };

  const calculatePositionSize = (
    portfolioValue: number,
    availableUSDT: number,
    strategy: string
  ): number => {
    const params = getRiskParameters();
    const idealSize = (portfolioValue * params.positionSizePercent) / 100;
    const actualSize = Math.min(idealSize, availableUSDT);
    
    // Check minimum trade size
    if (actualSize < params.minimumTradeSize) {
      return 0; // Cannot trade
    }
    
    return actualSize;
  };

  const canOpenNewPosition = (
    currentOpenPositions: number,
    strategy: string
  ): boolean => {
    const params = getRiskParameters();
    return currentOpenPositions < params.maxOpenPositions;
  };

  return {
    getRiskParameters,
    checkDrawdownLimit,
    calculatePositionSize,
    canOpenNewPosition
  };
};

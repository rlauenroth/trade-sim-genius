
import { calcTradeSize, getStrategyConfig, StrategyConfig } from '@/config/strategy';

export const useRiskManagement = (strategy: string) => {
  const getRiskParameters = (): StrategyConfig => {
    return getStrategyConfig(strategy);
  };

  const checkDrawdownLimit = (
    startValue: number,
    currentValue: number,
    strategy: string
  ): boolean => {
    const params = getRiskParameters();
    const drawdownPercent = ((currentValue - startValue) / startValue) * 100;
    // Using defaultStopLossPercent as drawdown limit (it's negative)
    return drawdownPercent >= params.defaultStopLossPercent * 2; // 2x stop loss as portfolio limit
  };

  const calculatePositionSize = (
    portfolioValue: number,
    availableUSDT: number,
    strategy: string
  ): { size: number; isValid: boolean; reason?: string } => {
    const actualSize = calcTradeSize(portfolioValue, availableUSDT, strategy);
    const config = getStrategyConfig(strategy);
    
    if (actualSize === 0) {
      return {
        size: 0,
        isValid: false,
        reason: `Nicht genügend USDT für Minimum-Trade (${config.minimumMeaningfulTradeSize} USDT benötigt, ${availableUSDT.toFixed(2)} USDT verfügbar)`
      };
    }
    
    return {
      size: actualSize,
      isValid: true
    };
  };

  const canOpenNewPosition = (
    currentOpenPositions: number,
    strategy: string
  ): boolean => {
    const params = getRiskParameters();
    return currentOpenPositions < params.maxOpenPositions;
  };

  const getTradeDisplayInfo = (portfolioValue: number, strategy: string) => {
    const config = getStrategyConfig(strategy);
    const idealSize = portfolioValue * config.tradeFraction;
    const percentage = (config.tradeFraction * 100).toFixed(1);
    
    return {
      idealSize: idealSize.toFixed(2),
      percentage,
      minimum: config.minimumMeaningfulTradeSize
    };
  };

  return {
    getRiskParameters,
    checkDrawdownLimit,
    calculatePositionSize,
    canOpenNewPosition,
    getTradeDisplayInfo
  };
};

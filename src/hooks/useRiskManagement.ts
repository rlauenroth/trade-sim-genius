
import { calcTradeSize, getStrategyConfig, StrategyConfig, MINIMUM_TRADE_USDT } from '@/config/strategy';

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
    
    if (actualSize === 0) {
      return {
        size: 0,
        isValid: false,
        reason: `Nicht genügend USDT für Trade. Benötigt: $${MINIMUM_TRADE_USDT}, verfügbar: $${availableUSDT.toFixed(2)}`
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
    const idealSize = Math.max(portfolioValue * config.tradeFraction, MINIMUM_TRADE_USDT);
    const percentage = (config.tradeFraction * 100).toFixed(1);
    
    return {
      idealSize: idealSize.toFixed(2),
      percentage,
      minimum: MINIMUM_TRADE_USDT
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

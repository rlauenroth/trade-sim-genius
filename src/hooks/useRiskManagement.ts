
import { calcTradeSize, getStrategyConfig, StrategyConfig, MINIMUM_TRADE_USDT } from '@/config/strategy';
import { Signal, SimulationState } from '@/types/simulation';

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

  // Add missing validateTradeRisk method
  const validateTradeRisk = (signal: Signal, simulationState: SimulationState): { isValid: boolean; reason?: string } => {
    const availableUSDT = simulationState.paperAssets.find(asset => asset.symbol === 'USDT')?.quantity || 0;
    const openPositionsCount = simulationState.openPositions.length;
    
    // Check if we can open new position
    if (!canOpenNewPosition(openPositionsCount, strategy)) {
      return {
        isValid: false,
        reason: `Maximale Anzahl offener Positionen erreicht (${openPositionsCount})`
      };
    }
    
    // Check position size
    const positionCheck = calculatePositionSize(simulationState.currentPortfolioValue, availableUSDT, strategy);
    if (!positionCheck.isValid) {
      return {
        isValid: false,
        reason: positionCheck.reason
      };
    }
    
    // Check drawdown limit
    if (!checkDrawdownLimit(simulationState.startPortfolioValue, simulationState.currentPortfolioValue, strategy)) {
      return {
        isValid: false,
        reason: 'Portfolio-Drawdown-Limit erreicht'
      };
    }
    
    return { isValid: true };
  };

  return {
    getRiskParameters,
    checkDrawdownLimit,
    calculatePositionSize,
    canOpenNewPosition,
    getTradeDisplayInfo,
    validateTradeRisk
  };
};

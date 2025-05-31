
import { useCallback } from 'react';
import { SimulationState } from '@/types/simulation';
import { loggingService } from '@/services/loggingService';

interface RiskLimits {
  maxDrawdown: number;
  maxOpenPositions: number;
  maxDailyLoss: number;
  minBalance: number;
}

export const useCircuitBreakerOptimized = () => {
  const enforceRiskLimitsOptimized = useCallback((
    simulationState: SimulationState,
    strategy: string,
    emergencyStop: () => void,
    addLogEntry: (type: any, message: string) => void,
    realTime: boolean = false
  ): boolean => {
    if (!simulationState) return false;

    const riskLimits: RiskLimits = {
      maxDrawdown: strategy === 'aggressive' ? 15 : strategy === 'conservative' ? 5 : 10,
      maxOpenPositions: strategy === 'aggressive' ? 8 : strategy === 'conservative' ? 3 : 5,
      maxDailyLoss: strategy === 'aggressive' ? 8 : strategy === 'conservative' ? 3 : 5,
      minBalance: 50
    };

    const currentValue = simulationState.currentPortfolioValue;
    const startValue = simulationState.startPortfolioValue;
    const openPositions = simulationState.openPositions?.length || 0;

    // Calculate current drawdown
    const drawdown = ((startValue - currentValue) / startValue) * 100;
    
    // Check risk limits
    const violations: string[] = [];

    if (drawdown > riskLimits.maxDrawdown) {
      violations.push(`Maximaler Drawdown überschritten: ${drawdown.toFixed(2)}% > ${riskLimits.maxDrawdown}%`);
    }

    if (openPositions > riskLimits.maxOpenPositions) {
      violations.push(`Zu viele offene Positionen: ${openPositions} > ${riskLimits.maxOpenPositions}`);
    }

    if (currentValue < riskLimits.minBalance) {
      violations.push(`Portfolio-Wert unter Minimum: $${currentValue} < $${riskLimits.minBalance}`);
    }

    // Daily loss check (simplified)
    const dailyLoss = Math.max(0, ((startValue - currentValue) / startValue) * 100);
    if (dailyLoss > riskLimits.maxDailyLoss) {
      violations.push(`Täglicher Verlust überschritten: ${dailyLoss.toFixed(2)}% > ${riskLimits.maxDailyLoss}%`);
    }

    if (violations.length > 0) {
      const riskMessage = `🚨 RISIKO-LIMITS ÜBERSCHRITTEN:\n${violations.join('\n')}`;
      
      loggingService.logError('Risk limits breached - emergency stop triggered', {
        violations,
        currentValue,
        startValue,
        drawdown,
        openPositions,
        strategy,
        timestamp: Date.now()
      });

      addLogEntry('RISK', riskMessage);
      addLogEntry('SIM', '🛑 Simulation automatisch gestoppt (Risiko-Management)');
      
      emergencyStop();
      return true;
    }

    // Log periodic risk assessment in real-time mode
    if (realTime && Math.random() < 0.1) { // 10% chance to log
      loggingService.logEvent('RISK', 'Risk assessment passed', {
        drawdown: drawdown.toFixed(2),
        openPositions,
        portfolioValue: currentValue,
        strategy,
        riskScore: Math.max(0, 100 - (drawdown * 5) - (openPositions * 2))
      });
    }

    return false;
  }, []);

  const liquidateAllPositions = useCallback((
    simulationState: SimulationState,
    addLogEntry: (type: any, message: string) => void
  ): SimulationState => {
    if (!simulationState.openPositions || simulationState.openPositions.length === 0) {
      return simulationState;
    }

    let totalLiquidationValue = 0;
    const liquidatedPositions = simulationState.openPositions.map(position => {
      // Simulate liquidation at current market price (with small slippage)
      const liquidationPrice = position.entryPrice * (1 + (Math.random() - 0.5) * 0.02); // ±1% slippage
      const liquidationValue = position.quantity * liquidationPrice;
      totalLiquidationValue += liquidationValue;

      addLogEntry('TRADE', `Position liquidiert: ${position.assetPair} @ $${liquidationPrice.toFixed(2)}`);
      
      return {
        ...position,
        exitPrice: liquidationPrice,
        exitTime: Date.now(),
        status: 'closed',
        pnl: liquidationValue - (position.quantity * position.entryPrice)
      };
    });

    const updatedState: SimulationState = {
      ...simulationState,
      currentPortfolioValue: simulationState.availableUSDT + totalLiquidationValue,
      availableUSDT: simulationState.availableUSDT + totalLiquidationValue,
      openPositions: [],
      closedPositions: [...(simulationState.closedPositions || []), ...liquidatedPositions],
      lastUpdateTime: Date.now()
    };

    loggingService.logEvent('RISK', 'Emergency liquidation completed', {
      liquidatedPositions: liquidatedPositions.length,
      totalValue: totalLiquidationValue,
      newPortfolioValue: updatedState.currentPortfolioValue
    });

    addLogEntry('RISK', `🔄 Alle ${liquidatedPositions.length} Positionen liquidiert - Wert: $${totalLiquidationValue.toFixed(2)}`);

    return updatedState;
  }, []);

  return {
    enforceRiskLimitsOptimized,
    liquidateAllPositions
  };
};

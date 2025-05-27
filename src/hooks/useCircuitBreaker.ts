
import { useCallback } from 'react';
import { SimulationState } from '@/types/simulation';
import { getStrategyConfig } from '@/config/strategy';
import { loggingService } from '@/services/loggingService';

export const useCircuitBreaker = () => {
  const checkDrawdownLimit = useCallback((
    simulationState: SimulationState,
    strategy: string
  ): { shouldPause: boolean; reason?: string; drawdownPercent: number } => {
    const config = getStrategyConfig(strategy);
    const drawdownPercent = ((simulationState.currentPortfolioValue - simulationState.startPortfolioValue) / simulationState.startPortfolioValue) * 100;
    
    // Use 2x stop loss as portfolio drawdown limit (e.g., -4% for balanced strategy)
    const drawdownLimit = config.defaultStopLossPercent * 2;
    
    loggingService.logEvent('SIM', 'Checking drawdown limit', {
      strategy,
      currentValue: simulationState.currentPortfolioValue,
      startValue: simulationState.startPortfolioValue,
      drawdownPercent,
      drawdownLimit,
      shouldPause: drawdownPercent <= drawdownLimit
    });

    if (drawdownPercent <= drawdownLimit) {
      return {
        shouldPause: true,
        reason: `Portfolio-Drawdown-Limit erreicht: ${drawdownPercent.toFixed(2)}% (Limit: ${drawdownLimit}%)`,
        drawdownPercent
      };
    }

    return { shouldPause: false, drawdownPercent };
  }, []);

  const checkPositionLimits = useCallback((
    simulationState: SimulationState,
    strategy: string
  ): { shouldPause: boolean; reason?: string } => {
    const config = getStrategyConfig(strategy);
    const openPositions = simulationState.openPositions.length;

    if (openPositions >= config.maxOpenPositions) {
      loggingService.logEvent('SIM', 'Position limit reached', {
        strategy,
        openPositions,
        maxPositions: config.maxOpenPositions
      });

      return {
        shouldPause: true,
        reason: `Maximale Anzahl offener Positionen erreicht: ${openPositions}/${config.maxOpenPositions}`
      };
    }

    return { shouldPause: false };
  }, []);

  const checkRiskLimits = useCallback((
    simulationState: SimulationState,
    strategy: string
  ): { shouldPause: boolean; reasons: string[]; metrics: Record<string, number> } => {
    const drawdownCheck = checkDrawdownLimit(simulationState, strategy);
    const positionCheck = checkPositionLimits(simulationState, strategy);
    
    const reasons: string[] = [];
    if (drawdownCheck.shouldPause && drawdownCheck.reason) {
      reasons.push(drawdownCheck.reason);
    }
    if (positionCheck.shouldPause && positionCheck.reason) {
      reasons.push(positionCheck.reason);
    }

    const shouldPause = drawdownCheck.shouldPause || positionCheck.shouldPause;

    const metrics = {
      drawdownPercent: drawdownCheck.drawdownPercent,
      openPositions: simulationState.openPositions.length,
      portfolioValue: simulationState.currentPortfolioValue,
      realizedPnL: simulationState.realizedPnL
    };

    if (shouldPause) {
      loggingService.logEvent('SIM', 'Risk limits breached - pausing simulation', {
        strategy,
        reasons,
        metrics
      });
    }

    return { shouldPause, reasons, metrics };
  }, [checkDrawdownLimit, checkPositionLimits]);

  const enforceRiskLimits = useCallback((
    simulationState: SimulationState,
    strategy: string,
    pauseSimulation: () => void,
    addLogEntry: (type: any, message: string) => void
  ): boolean => {
    const riskCheck = checkRiskLimits(simulationState, strategy);
    
    if (riskCheck.shouldPause) {
      pauseSimulation();
      
      riskCheck.reasons.forEach(reason => {
        addLogEntry('RISK', `🚨 CIRCUIT BREAKER: ${reason}`);
      });
      
      addLogEntry('RISK', '🛑 Simulation automatisch pausiert - Risiko-Limits erreicht');
      
      loggingService.logEvent('SIM', 'Simulation paused by circuit breaker', {
        strategy,
        reasons: riskCheck.reasons,
        metrics: riskCheck.metrics
      });

      return true;
    }

    return false;
  }, [checkRiskLimits]);

  const getPortfolioHealthStatus = useCallback((
    simulationState: SimulationState,
    strategy: string
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' => {
    const drawdownCheck = checkDrawdownLimit(simulationState, strategy);
    const config = getStrategyConfig(strategy);
    
    // Warning at 50% of drawdown limit
    const warningThreshold = (config.defaultStopLossPercent * 2) * 0.5;
    
    if (drawdownCheck.shouldPause) {
      return 'CRITICAL';
    } else if (drawdownCheck.drawdownPercent <= warningThreshold) {
      return 'WARNING';
    }
    
    return 'HEALTHY';
  }, [checkDrawdownLimit]);

  return {
    checkRiskLimits,
    enforceRiskLimits,
    getPortfolioHealthStatus,
    checkDrawdownLimit,
    checkPositionLimits
  };
};

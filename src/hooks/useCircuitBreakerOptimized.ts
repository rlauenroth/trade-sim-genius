
import { useCallback, useRef } from 'react';
import { SimulationState } from '@/types/simulation';
import { getStrategyConfig } from '@/config/strategy';
import { loggingService } from '@/services/loggingService';

export const useCircuitBreakerOptimized = () => {
  const lastRiskCheckTime = useRef<number>(0);
  const RISK_CHECK_DEBOUNCE_MS = 60000; // 1 Minute Debouncing

  const checkDrawdownLimit = useCallback((
    simulationState: SimulationState,
    strategy: string
  ): { shouldPause: boolean; reason?: string; drawdownPercent: number } => {
    const config = getStrategyConfig(strategy);
    const drawdownPercent = ((simulationState.currentPortfolioValue - simulationState.startPortfolioValue) / simulationState.startPortfolioValue) * 100;
    
    // Use 2x stop loss as portfolio drawdown limit (e.g., -4% for balanced strategy)
    const drawdownLimit = config.defaultStopLossPercent * 2;
    
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
      return {
        shouldPause: true,
        reason: `Maximale Anzahl offener Positionen erreicht: ${openPositions}/${config.maxOpenPositions}`
      };
    }

    return { shouldPause: false };
  }, []);

  const shouldPerformRiskCheck = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastRiskCheckTime.current;
    
    if (timeSinceLastCheck < RISK_CHECK_DEBOUNCE_MS) {
      return false;
    }
    
    lastRiskCheckTime.current = now;
    return true;
  }, []);

  const checkRiskLimitsDebounced = useCallback((
    simulationState: SimulationState,
    strategy: string,
    forceCheck: boolean = false
  ): { shouldPause: boolean; reasons: string[]; metrics: Record<string, number> } => {
    // Only perform risk check if debounce period has passed or it's forced (after trade)
    if (!forceCheck && !shouldPerformRiskCheck()) {
      return {
        shouldPause: false,
        reasons: [],
        metrics: {
          drawdownPercent: 0,
          openPositions: simulationState.openPositions.length,
          portfolioValue: simulationState.currentPortfolioValue,
          realizedPnL: simulationState.realizedPnL
        }
      };
    }

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
  }, [checkDrawdownLimit, checkPositionLimits, shouldPerformRiskCheck]);

  const enforceRiskLimitsOptimized = useCallback((
    simulationState: SimulationState,
    strategy: string,
    pauseSimulation: () => void,
    addLogEntry: (type: any, message: string) => void,
    forceCheck: boolean = false
  ): boolean => {
    const riskCheck = checkRiskLimitsDebounced(simulationState, strategy, forceCheck);
    
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
  }, [checkRiskLimitsDebounced]);

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

  // New function to liquidate all positions when drawdown breaker triggers
  const liquidateAllPositions = useCallback((
    simulationState: SimulationState,
    addLogEntry: (type: any, message: string) => void
  ) => {
    if (simulationState.openPositions.length === 0) {
      addLogEntry('INFO', 'Keine offenen Positionen für Emergency-Liquidation vorhanden');
      return simulationState;
    }

    let updatedAssets = [...simulationState.paperAssets];
    let totalRealizedPnL = simulationState.realizedPnL;
    let liquidatedPositions = 0;

    addLogEntry('RISK', '🚨 EMERGENCY LIQUIDATION: Schließe alle offenen Positionen');

    // Process each position for liquidation
    simulationState.openPositions.forEach(position => {
      try {
        // Use mock current market price (simulation mode)
        const currentPrice = position.assetPair.includes('BTC') ? 60000 : 3000;
        const sellValue = position.quantity * currentPrice;
        const tradingFee = sellValue * 0.001; // 0.1% fee
        const netSellValue = sellValue - tradingFee;
        
        // Calculate realized P&L for this position
        const positionCost = position.quantity * position.entryPrice;
        const positionPnL = netSellValue - positionCost;
        totalRealizedPnL += positionPnL;

        // Update USDT balance
        const usdtAssetIndex = updatedAssets.findIndex(asset => asset.symbol === 'USDT');
        if (usdtAssetIndex >= 0) {
          updatedAssets[usdtAssetIndex].quantity += netSellValue;
        } else {
          updatedAssets.push({ symbol: 'USDT', quantity: netSellValue });
        }

        // Remove or reduce the traded asset
        const assetSymbol = position.assetPair.split('/')[0] || position.assetPair.split('-')[0];
        const assetIndex = updatedAssets.findIndex(asset => asset.symbol === assetSymbol);
        if (assetIndex >= 0) {
          updatedAssets[assetIndex].quantity = Math.max(0, updatedAssets[assetIndex].quantity - position.quantity);
          if (updatedAssets[assetIndex].quantity < 0.000001) {
            updatedAssets.splice(assetIndex, 1);
          }
        }

        liquidatedPositions++;
        
        addLogEntry('TRADE', `🛑 Liquidiert: ${position.quantity.toFixed(6)} ${assetSymbol} @ $${currentPrice.toFixed(2)} (P&L: ${positionPnL >= 0 ? '+' : ''}$${positionPnL.toFixed(2)})`);
      } catch (error) {
        console.error('Error liquidating position:', position.id, error);
        addLogEntry('ERROR', `Fehler beim Liquidieren von Position ${position.assetPair}`);
      }
    });

    // Calculate new portfolio value
    const newPortfolioValue = updatedAssets.reduce((total, asset) => {
      if (asset.symbol === 'USDT') return total + asset.quantity;
      // Use mock prices for other assets
      const mockPrice = asset.symbol.includes('BTC') ? 60000 : 3000;
      return total + (asset.quantity * mockPrice);
    }, 0);

    addLogEntry('RISK', `✅ Emergency-Liquidation abgeschlossen: ${liquidatedPositions} Positionen geschlossen`);
    addLogEntry('PORTFOLIO_UPDATE', `Portfolio-Wert nach Liquidation: $${newPortfolioValue.toFixed(2)}`);

    return {
      ...simulationState,
      openPositions: [],
      paperAssets: updatedAssets,
      currentPortfolioValue: newPortfolioValue,
      realizedPnL: totalRealizedPnL
    };
  }, []);

  return {
    checkRiskLimitsDebounced,
    enforceRiskLimitsOptimized,
    getPortfolioHealthStatus,
    checkDrawdownLimit,
    checkPositionLimits,
    liquidateAllPositions
  };
};

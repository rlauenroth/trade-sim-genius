
import { useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useRiskManagement } from './useRiskManagement';
import { loggingService } from '@/services/loggingService';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useEnhancedErrorHandling } from './useEnhancedErrorHandling';

export const useAutoTradeExecution = () => {
  const { trackTradeExecution } = usePerformanceMonitoring();
  const { withErrorHandling } = useEnhancedErrorHandling({
    component: 'AutoTradeExecution',
    action: 'executeAutoTrade',
    timestamp: Date.now()
  });

  const executeAutoTrade = useCallback(async (
    signal: Signal,
    simulationState: SimulationState,
    updateSimulationState: (state: SimulationState) => void,
    addLogEntry: (type: any, message: string) => void
  ): Promise<boolean> => {
    const startTime = Date.now();

    return await withErrorHandling(async () => {
      if (!signal || !simulationState) {
        throw new Error('Invalid signal or simulation state');
      }

      console.log('🤖 Auto-Trade Execution:', {
        signal: signal.assetPair,
        signalType: signal.signalType,
        portfolioValue: simulationState.currentPortfolioValue,
        availableUSDT: simulationState.availableUSDT,
        timestamp: Date.now()
      });

      const { calculatePositionSize } = useRiskManagement('balanced');
      
      // Calculate position size with risk management
      const positionResult = calculatePositionSize(
        simulationState.currentPortfolioValue,
        simulationState.availableUSDT,
        'balanced'
      );

      if (!positionResult.isValid) {
        addLogEntry('TRADE', `🚫 Auto-Trade abgelehnt: ${positionResult.reason}`);
        trackTradeExecution(false, Date.now() - startTime);
        return false;
      }

      // Execute the trade with enhanced validation
      const entryPrice = signal.entryPriceSuggestion || 100; // Fallback price
      const quantity = positionResult.size / entryPrice;
      const totalCost = quantity * entryPrice;

      if (totalCost > simulationState.availableUSDT) {
        addLogEntry('TRADE', `🚫 Auto-Trade abgelehnt: Unzureichende Mittel ($${totalCost.toFixed(2)} > $${simulationState.availableUSDT.toFixed(2)})`);
        trackTradeExecution(false, Date.now() - startTime);
        return false;
      }

      // Create new position
      const newPosition = {
        id: `auto-${Date.now()}`,
        assetPair: signal.assetPair,
        type: signal.signalType,
        quantity,
        entryPrice,
        entryTime: Date.now(),
        stopLossPrice: signal.stopLossPrice,
        takeProfitPrice: signal.takeProfitPrice,
        status: 'open' as const,
        isAutoTrade: true
      };

      // Update simulation state with enhanced state management
      const updatedState: SimulationState = {
        ...simulationState,
        currentPortfolioValue: simulationState.currentPortfolioValue, // Keep same for now
        availableUSDT: simulationState.availableUSDT - totalCost,
        openPositions: [...(simulationState.openPositions || []), newPosition],
        lastUpdateTime: Date.now(),
        autoTradeCount: (simulationState.autoTradeCount || 0) + 1
      };

      updateSimulationState(updatedState);

      // Enhanced logging
      addLogEntry('TRADE', `✅ Auto-Trade ausgeführt: ${signal.signalType} ${quantity.toFixed(4)} ${signal.assetPair} @ $${entryPrice.toFixed(2)}`);
      addLogEntry('INFO', `💰 Investiert: $${totalCost.toFixed(2)} | Verfügbar: $${updatedState.availableUSDT.toFixed(2)}`);

      loggingService.logSuccess('Auto trade executed successfully', {
        signal: signal.assetPair,
        signalType: signal.signalType,
        quantity,
        entryPrice,
        totalCost,
        remainingUSDT: updatedState.availableUSDT,
        portfolioValue: updatedState.currentPortfolioValue,
        executionTime: Date.now() - startTime
      });

      trackTradeExecution(true, Date.now() - startTime);
      return true;

    }, 'executeAutoTrade', 'high') ?? false;
  }, [withErrorHandling, trackTradeExecution]);

  return { executeAutoTrade };
};

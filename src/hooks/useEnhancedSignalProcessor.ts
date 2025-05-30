
import { useCallback } from 'react';
import { Signal, SimulationState } from '@/types/simulation';
import { useSignalProcessor } from './useSignalProcessor';
import { useAutoTradeExecution } from './useAutoTradeExecution';
import { useCircuitBreakerOptimized } from './useCircuitBreakerOptimized';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { usePortfolioEvaluation } from './usePortfolioEvaluation';

export const useEnhancedSignalProcessor = (
  simulationState: SimulationState | null,
  isSimulationActive: boolean,
  updateSimulationState: (state: SimulationState) => void,
  pauseSimulationState: () => void,
  addLogEntry: (type: any, message: string) => void,
  setCurrentSignal: (signal: Signal | null) => void
) => {
  const { processSignal } = useSignalProcessor();
  const { executeAutoTrade } = useAutoTradeExecution();
  const { enforceRiskLimitsOptimized, liquidateAllPositions } = useCircuitBreakerOptimized();
  const { trackSimulationCycle } = usePerformanceMonitoring();
  const { triggerEvaluation } = usePortfolioEvaluation(
    simulationState,
    isSimulationActive,
    updateSimulationState
  );

  const handleProcessSignal = useCallback(async (
    signal: Signal,
    userSettings: any
  ) => {
    const cycleStartTime = Date.now();
    const portfolioValueBefore = simulationState?.currentPortfolioValue || 0;

    await processSignal(
      signal,
      userSettings,
      isSimulationActive,
      simulationState,
      setCurrentSignal,
      executeAutoTrade,
      updateSimulationState,
      addLogEntry
    );

    // Trigger portfolio evaluation after trade execution
    if (simulationState && simulationState.openPositions.length > 0) {
      await triggerEvaluation();
    }

    // Only check risk limits AFTER trade execution (force check)
    if (simulationState && userSettings.tradingStrategy) {
      const riskLimitReached = enforceRiskLimitsOptimized(
        simulationState,
        userSettings.tradingStrategy,
        () => {
          // Enhanced pause with position liquidation on drawdown breach
          if (simulationState) {
            const liquidatedState = liquidateAllPositions(simulationState, addLogEntry);
            updateSimulationState(liquidatedState);
          }
          pauseSimulationState();
        },
        addLogEntry,
        true // Force check after trade
      );
    }

    // Track simulation cycle performance
    const cycleEndTime = Date.now();
    const portfolioValueAfter = simulationState?.currentPortfolioValue || portfolioValueBefore;
    trackSimulationCycle(cycleStartTime, cycleEndTime, portfolioValueBefore, portfolioValueAfter);
  }, [processSignal, isSimulationActive, simulationState, setCurrentSignal, executeAutoTrade, updateSimulationState, addLogEntry, enforceRiskLimitsOptimized, pauseSimulationState, trackSimulationCycle, liquidateAllPositions, triggerEvaluation]);

  return {
    handleProcessSignal
  };
};
